from __future__ import annotations

import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

from asn1crypto import keys as asn1_keys
from asn1crypto import x509 as asn1_x509
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import signers
from pyhanko.sign.fields import SigSeedSubFilter
from pyhanko.sign.timestamps import DummyTimeStamper, TimeStamper

logger = logging.getLogger(__name__)

DEFAULT_MAX_PDF_BYTES = 10 * 1024 * 1024


class SignatureError(Exception):
    def __init__(self, user_message: str, technical_message: str):
        super().__init__(technical_message)
        self.user_message = user_message
        self.technical_message = technical_message


class PdfUnreadableError(SignatureError):
    pass


class CertificateExpiredError(SignatureError):
    pass


class CertificateRevokedError(SignatureError):
    pass


class PdfTooLargeError(SignatureError):
    pass


@dataclass(frozen=True)
class SignerIdentity:
    private_key_path: Path
    certificate_path: Path
    chain_paths: list[Path]
    passphrase: str
    signer_id: str = "local-test-signer"


@dataclass(frozen=True)
class SignedPdfResult:
    signed_pdf_path: Path
    before_sha256: str
    after_sha256: str


class RevocationChecker:
    def __init__(self, revoked_serial_numbers: Iterable[int] | None = None):
        self._revoked_serial_numbers = set(revoked_serial_numbers or [])

    def is_revoked(self, certificate: x509.Certificate) -> bool:
        return certificate.serial_number in self._revoked_serial_numbers


class TimestampProvider(ABC):
    @abstractmethod
    def build_timestamper(self) -> TimeStamper:
        raise NotImplementedError


@dataclass(frozen=True)
class LocalFakeTSA(TimestampProvider):
    common_name: str = "POC Local Fake TSA"
    fixed_time: datetime | None = None
    _private_key: rsa.RSAPrivateKey = field(init=False, repr=False)
    _certificate: x509.Certificate = field(init=False, repr=False)

    def __post_init__(self) -> None:
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        now = datetime.now(timezone.utc)
        subject = x509.Name(
            [
                x509.NameAttribute(NameOID.COUNTRY_NAME, "MA"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "POC Signature Electronique"),
                x509.NameAttribute(NameOID.COMMON_NAME, self.common_name),
            ]
        )
        certificate = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(subject)
            .public_key(private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(minutes=1))
            .not_valid_after(now + timedelta(days=365))
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.TIME_STAMPING]), critical=True)
            .sign(private_key=private_key, algorithm=hashes.SHA256())
        )
        object.__setattr__(self, "_private_key", private_key)
        object.__setattr__(self, "_certificate", certificate)

    def build_timestamper(self) -> TimeStamper:
        # PyHanko attend une TSA sous forme asn1crypto ; on garde cette conversion ici
        # pour pouvoir remplacer LocalFakeTSA par une vraie TSA HTTP sans toucher signer_document().
        return DummyTimeStamper(
            tsa_cert=_to_asn1_certificate(self._certificate),
            tsa_key=_to_asn1_private_key(self._private_key),
            fixed_dt=self.fixed_time,
        )


def signer_document(
    chemin_pdf: str | Path,
    certificat_utilisateur: SignerIdentity,
    output_path: str | Path | None = None,
    timestamp_provider: TimestampProvider | None = None,
    revocation_checker: RevocationChecker | None = None,
    max_pdf_bytes: int = DEFAULT_MAX_PDF_BYTES,
) -> SignedPdfResult:
    pdf_path = Path(chemin_pdf)
    signed_path = Path(output_path) if output_path else pdf_path.with_name(f"{pdf_path.stem}-signed.pdf")
    timestamp_provider = timestamp_provider or LocalFakeTSA()
    revocation_checker = revocation_checker or RevocationChecker()

    _validate_pdf_file(pdf_path, max_pdf_bytes)
    certificate = _load_user_certificate(certificat_utilisateur.certificate_path)
    _validate_certificate(certificate, revocation_checker)

    before_hash = _sha256_file(pdf_path)
    logger.info(
        "Hash SHA-256 avant signature: %s",
        before_hash,
        extra={"document": str(pdf_path), "signer_id": certificat_utilisateur.signer_id, "sha256": before_hash},
    )

    try:
        # PyHanko charge la cle privee, le certificat signataire et la chaine CA pour
        # construire le CMS ; on lui donne les fichiers PEM car c'est le format stocke par la mini-PKI.
        signer = signers.SimpleSigner.load(
            key_file=str(certificat_utilisateur.private_key_path),
            cert_file=str(certificat_utilisateur.certificate_path),
            ca_chain_files=[str(path) for path in certificat_utilisateur.chain_paths],
            key_passphrase=certificat_utilisateur.passphrase.encode("utf-8"),
        )
        # PyHanko utilise ces metadonnees pour creer le dictionnaire de signature PDF :
        # le champ, l'algorithme de hash et le sous-filtre PAdES qui rend la signature interoperable.
        signature_meta = signers.PdfSignatureMetadata(
            field_name="Signature1",
            md_algorithm="sha256",
            reason="Signature electronique POC avec certificat utilisateur de test",
            location="Local POC",
            subfilter=SigSeedSubFilter.PADES,
        )
        with pdf_path.open("rb") as input_stream, signed_path.open("wb") as output_stream:
            # PyHanko ouvre le PDF en mode incremental pour ajouter la signature sans reecrire
            # tout le document, ce qui preserve le contenu existant et ajoute une revision signee.
            writer = IncrementalPdfFileWriter(input_stream, strict=True)
            # PyHanko reserve l'espace CMS, calcule le ByteRange, signe les octets couverts,
            # ajoute le timestamp fourni, puis ecrit le PDF signe dans le flux de sortie.
            signers.sign_pdf(
                writer,
                signature_meta=signature_meta,
                signer=signer,
                timestamper=timestamp_provider.build_timestamper(),
                output=output_stream,
            )
    except SignatureError:
        raise
    except Exception as exc:
        logger.exception(
            "Echec de signature PDF",
            extra={"document": str(pdf_path), "signer_id": certificat_utilisateur.signer_id, "step": "pyhanko_sign_pdf"},
        )
        raise PdfUnreadableError(
            "Le PDF est illisible ou corrompu. Essayez avec un PDF valide.",
            f"pyHanko n'a pas pu signer le fichier {pdf_path}: {exc}",
        ) from exc

    after_hash = _sha256_file(signed_path)
    logger.info(
        "Hash SHA-256 apres signature: %s",
        after_hash,
        extra={"document": str(signed_path), "signer_id": certificat_utilisateur.signer_id, "sha256": after_hash},
    )
    return SignedPdfResult(signed_pdf_path=signed_path, before_sha256=before_hash, after_sha256=after_hash)


def _validate_pdf_file(pdf_path: Path, max_pdf_bytes: int) -> None:
    if not pdf_path.exists() or not pdf_path.is_file():
        raise PdfUnreadableError(
            "Le fichier PDF est introuvable.",
            f"Aucun fichier lisible a l'emplacement {pdf_path}",
        )
    file_size = pdf_path.stat().st_size
    if file_size > max_pdf_bytes:
        raise PdfTooLargeError(
            "Le PDF est trop volumineux pour ce POC.",
            f"Taille={file_size} octets, limite={max_pdf_bytes} octets, fichier={pdf_path}",
        )
    if pdf_path.read_bytes()[:5] != b"%PDF-":
        raise PdfUnreadableError(
            "Le fichier ne semble pas etre un PDF valide.",
            f"L'en-tete %PDF- est absent dans {pdf_path}",
        )


def _load_user_certificate(certificate_path: Path) -> x509.Certificate:
    try:
        return x509.load_pem_x509_certificate(certificate_path.read_bytes())
    except Exception as exc:
        raise PdfUnreadableError(
            "Le certificat utilisateur est illisible.",
            f"Impossible de charger le certificat {certificate_path}: {exc}",
        ) from exc


def _validate_certificate(certificate: x509.Certificate, revocation_checker: RevocationChecker) -> None:
    now = datetime.now(timezone.utc)
    if not certificate.not_valid_before_utc <= now <= certificate.not_valid_after_utc:
        raise CertificateExpiredError(
            "Le certificat du signataire est expire ou pas encore valide.",
            f"Validite certificat: {certificate.not_valid_before_utc} -> {certificate.not_valid_after_utc}",
        )
    if revocation_checker.is_revoked(certificate):
        raise CertificateRevokedError(
            "Le certificat du signataire est revoque.",
            f"Numero de serie revoque: {certificate.serial_number}",
        )


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _to_asn1_certificate(certificate: x509.Certificate) -> asn1_x509.Certificate:
    return asn1_x509.Certificate.load(certificate.public_bytes(serialization.Encoding.DER))


def _to_asn1_private_key(private_key: ec.EllipticCurvePrivateKey | rsa.RSAPrivateKey) -> asn1_keys.PrivateKeyInfo:
    private_key_der = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return asn1_keys.PrivateKeyInfo.load(private_key_der)
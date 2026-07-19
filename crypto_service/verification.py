from __future__ import annotations

import binascii
import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from asn1crypto import cms
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa

from signature import PdfUnreadableError, RevocationChecker, SignatureError

logger = logging.getLogger(__name__)

_BYTE_RANGE_PATTERN = re.compile(rb"/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]")


def verifier_document(
    chemin_pdf_signe: str | Path,
    revocation_checker: RevocationChecker | None = None,
) -> dict[str, Any]:
    pdf_path = Path(chemin_pdf_signe)
    revocation_checker = revocation_checker or RevocationChecker()

    report: dict[str, Any] = {
        "document": str(pdf_path),
        "integrity": "unknown",
        "is_integral": False,
        "message": "Verification non terminee.",
        "byte_range": None,
        "computed_sha256": None,
        "cms_message_digest": None,
        "cms_signature_valid": False,
        "signer": None,
        "signature_date": None,
        "certificate": None,
        "certificate_chain": [],
        "timestamp_token": None,
        "signature_algorithm": None,
        "errors": [],
    }

    try:
        data = _read_signed_pdf(pdf_path)
        byte_range = _extract_byte_range(data)
        signed_content = _content_covered_by_byte_range(data, byte_range)
        computed_digest = hashlib.sha256(signed_content).digest()
        content_info = _extract_cms_content_info(data, byte_range)
        signed_data = content_info["content"]
        signer_info = signed_data["signer_infos"][0]
        certificates = _extract_certificates(signed_data)
        cms_digest = _extract_cms_message_digest(signer_info)
        signer_certificate = _extract_signer_certificate(signed_data, signer_info)
        signature_date = _extract_signature_date(signer_info)
        certificate_report = _certificate_report(signer_certificate, signature_date, revocation_checker)
        cms_signature_valid = _verify_cms_signature(signer_certificate, signer_info)

        # La comparaison centrale du POC est celle-ci : on recalcule le hash des octets
        # couverts par le ByteRange et on le compare au messageDigest protege dans le CMS.
        is_integral = computed_digest == cms_digest and cms_signature_valid
        report.update(
            {
                "integrity": "intact" if is_integral else "altered",
                "is_integral": is_integral,
                "message": (
                    "Le document correspond aux octets signes."
                    if is_integral
                    else "Alteration detectee : le hash recalcule ne correspond pas au messageDigest signe."
                ),
                "byte_range": list(byte_range),
                "computed_sha256": computed_digest.hex(),
                "cms_message_digest": cms_digest.hex(),
                "cms_signature_valid": cms_signature_valid,
                "signer": _signer_identity(signer_certificate),
                "signature_date": signature_date.isoformat() if signature_date else None,
                "certificate": certificate_report,
                "certificate_chain": _certificate_chain_report(certificates, signer_certificate, signature_date, revocation_checker),
                "timestamp_token": _timestamp_token_report(signer_info),
                "signature_algorithm": _signature_algorithm_report(signer_certificate, signer_info),
            }
        )
        logger.info(
            "Verification PDF terminee: %s",
            report["integrity"],
            extra={"document": str(pdf_path), "integrity": report["integrity"]},
        )
    except SignatureError as exc:
        report["integrity"] = "invalid"
        report["message"] = exc.user_message
        report["errors"].append(exc.technical_message)
        logger.exception("Verification PDF impossible", extra={"document": str(pdf_path)})
    except Exception as exc:
        report["integrity"] = "invalid"
        report["message"] = "Le PDF signe ne peut pas etre verifie."
        report["errors"].append(str(exc))
        logger.exception("Erreur inattendue pendant la verification PDF", extra={"document": str(pdf_path)})

    return report


def rapport_json(report: dict[str, Any]) -> str:
    return json.dumps(report, ensure_ascii=False, indent=2)


def _read_signed_pdf(pdf_path: Path) -> bytes:
    if not pdf_path.exists() or not pdf_path.is_file():
        raise PdfUnreadableError(
            "Le PDF signe est introuvable.",
            f"Aucun fichier lisible a l'emplacement {pdf_path}",
        )
    data = pdf_path.read_bytes()
    if not data.startswith(b"%PDF-"):
        raise PdfUnreadableError(
            "Le fichier ne semble pas etre un PDF valide.",
            f"L'en-tete %PDF- est absent dans {pdf_path}",
        )
    return data


def _extract_byte_range(data: bytes) -> tuple[int, int, int, int]:
    match = _BYTE_RANGE_PATTERN.search(data)
    if not match:
        raise PdfUnreadableError(
            "Aucune signature PDF avec ByteRange n'a ete trouvee.",
            "Le marqueur /ByteRange est absent du fichier signe.",
        )
    values = tuple(int(group) for group in match.groups())
    start_1, length_1, start_2, length_2 = values
    if start_1 < 0 or length_1 < 0 or start_2 < 0 or length_2 < 0:
        raise PdfUnreadableError("Le ByteRange est invalide.", f"Valeurs negatives: {values}")
    if start_1 + length_1 > len(data) or start_2 + length_2 > len(data):
        raise PdfUnreadableError("Le ByteRange depasse la taille du fichier.", f"ByteRange={values}, taille={len(data)}")
    return values


def _content_covered_by_byte_range(data: bytes, byte_range: tuple[int, int, int, int]) -> bytes:
    start_1, length_1, start_2, length_2 = byte_range
    return data[start_1 : start_1 + length_1] + data[start_2 : start_2 + length_2]


def _extract_cms_content_info(data: bytes, byte_range: tuple[int, int, int, int]) -> cms.ContentInfo:
    byte_range_match = _BYTE_RANGE_PATTERN.search(data)
    if not byte_range_match:
        raise PdfUnreadableError("Aucune signature PDF avec ByteRange n'a ete trouvee.", "ByteRange introuvable.")
    contents_marker = data.rfind(b"/Contents", 0, byte_range_match.start())
    if contents_marker == -1:
        raise PdfUnreadableError("Le conteneur CMS est introuvable.", "Le marqueur /Contents avant /ByteRange est absent.")
    hex_start = data.find(b"<", contents_marker)
    hex_end = data.find(b">", hex_start)
    if hex_start == -1 or hex_end == -1:
        raise PdfUnreadableError("Le conteneur CMS est mal forme.", "La valeur hexadecimale /Contents est incomplete.")
    try:
        cms_bytes = binascii.unhexlify(re.sub(rb"\s+", b"", data[hex_start + 1 : hex_end]))
        return cms.ContentInfo.load(cms_bytes, strict=False)
    except Exception as exc:
        raise PdfUnreadableError(
            "Le conteneur CMS de signature est illisible.",
            f"Impossible de parser /Contents comme CMS: {exc}",
        ) from exc


def _extract_cms_message_digest(signer_info: cms.SignerInfo) -> bytes:
    for attribute in signer_info["signed_attrs"]:
        if attribute["type"].native == "message_digest":
            return attribute["values"][0].native
    raise PdfUnreadableError(
        "La signature ne contient pas de hash protege.",
        "Attribut CMS message_digest absent.",
    )


def _extract_signer_certificate(signed_data: cms.SignedData, signer_info: cms.SignerInfo) -> x509.Certificate:
    signer_identifier = signer_info["sid"].chosen
    serial_number = signer_identifier["serial_number"].native
    for certificate_choice in signed_data["certificates"]:
        if certificate_choice.name != "certificate":
            continue
        candidate = certificate_choice.chosen
        if candidate.serial_number == serial_number:
            return x509.load_der_x509_certificate(candidate.dump())
    raise PdfUnreadableError(
        "Le certificat du signataire est absent du CMS.",
        f"Aucun certificat avec le numero de serie {serial_number} dans SignedData.",
    )



def _extract_certificates(signed_data: cms.SignedData) -> list[x509.Certificate]:
    certificates: list[x509.Certificate] = []
    for certificate_choice in signed_data["certificates"]:
        if certificate_choice.name == "certificate":
            certificates.append(x509.load_der_x509_certificate(certificate_choice.chosen.dump()))
    return certificates


def _certificate_chain_report(
    certificates: list[x509.Certificate],
    signer_certificate: x509.Certificate,
    signature_date: datetime | None,
    revocation_checker: RevocationChecker,
) -> list[dict[str, Any]]:
    order = {"Root CA": 0, "Intermediaire": 1, "Utilisateur": 2, "Certificat": 3}
    rows: list[dict[str, Any]] = []
    for certificate in certificates:
        role = _certificate_role(certificate, signer_certificate)
        certificate_report = _certificate_report(certificate, signature_date, revocation_checker)
        rows.append(
            {
                "role": role,
                "common_name": _subject_value(certificate.subject, x509.oid.NameOID.COMMON_NAME),
                "subject": certificate.subject.rfc4514_string(),
                "issuer": certificate.issuer.rfc4514_string(),
                "serial_number": str(certificate.serial_number),
                "key": _public_key_report(certificate),
                **certificate_report,
            }
        )
    return sorted(rows, key=lambda row: order.get(row["role"], 99))


def _certificate_role(certificate: x509.Certificate, signer_certificate: x509.Certificate) -> str:
    if certificate.serial_number == signer_certificate.serial_number:
        return "Utilisateur"
    if certificate.subject == certificate.issuer:
        return "Root CA"
    return "Intermediaire"


def _signature_algorithm_report(certificate: x509.Certificate, signer_info: cms.SignerInfo) -> dict[str, Any]:
    public_key = certificate.public_key()
    digest_algorithm = signer_info["digest_algorithm"]["algorithm"].native
    key_report = _public_key_report(certificate)
    return {
        **key_report,
        "digest": digest_algorithm.upper(),
        "label": f"{key_report['family']} {key_report['label']} / {digest_algorithm.upper()}",
    }


def _public_key_report(certificate: x509.Certificate) -> dict[str, Any]:
    public_key = certificate.public_key()
    if isinstance(public_key, ec.EllipticCurvePublicKey):
        curve_label = "P-256" if public_key.curve.name == "secp256r1" else public_key.curve.name
        return {"family": "ECDSA", "label": curve_label, "bits": public_key.curve.key_size}
    if isinstance(public_key, rsa.RSAPublicKey):
        return {"family": "RSA", "label": f"{public_key.key_size} bits", "bits": public_key.key_size}
    return {"family": "Inconnu", "label": "cle non supportee", "bits": None}


def _timestamp_token_report(signer_info: cms.SignerInfo) -> dict[str, Any]:
    unsigned_attrs = signer_info["unsigned_attrs"]
    if not unsigned_attrs.native:
        return {"present": False, "raw_der_hex": None, "size_bytes": 0, "signing_time": None}
    for attribute in unsigned_attrs:
        if attribute["type"].native != "signature_time_stamp_token":
            continue
        token = attribute["values"][0]
        raw = token.dump()
        return {
            "present": True,
            "raw_der_hex": raw.hex(),
            "size_bytes": len(raw),
            "signing_time": _timestamp_signing_time(token),
        }
    return {"present": False, "raw_der_hex": None, "size_bytes": 0, "signing_time": None}


def _timestamp_signing_time(token: cms.ContentInfo) -> str | None:
    try:
        token_signer_info = token["content"]["signer_infos"][0]
        for attribute in token_signer_info["signed_attrs"]:
            if attribute["type"].native == "signing_time":
                return attribute["values"][0].native.isoformat()
    except Exception:
        return None
    return None

def _verify_cms_signature(certificate: x509.Certificate, signer_info: cms.SignerInfo) -> bool:
    public_key = certificate.public_key()
    signature = signer_info["signature"].native
    signed_attrs_der = signer_info["signed_attrs"].untag().dump()
    digest_algorithm = signer_info["digest_algorithm"]["algorithm"].native
    hash_algorithm = _hash_algorithm(digest_algorithm)
    try:
        if isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key.verify(signature, signed_attrs_der, ec.ECDSA(hash_algorithm))
        elif isinstance(public_key, rsa.RSAPublicKey):
            public_key.verify(signature, signed_attrs_der, padding.PKCS1v15(), hash_algorithm)
        else:
            return False
        return True
    except InvalidSignature:
        return False


def _hash_algorithm(name: str) -> hashes.HashAlgorithm:
    if name != "sha256":
        raise PdfUnreadableError(
            "Algorithme de hash non supporte par ce POC.",
            f"Algorithme CMS recu: {name}",
        )
    return hashes.SHA256()


def _extract_signature_date(signer_info: cms.SignerInfo) -> datetime | None:
    for attribute in signer_info["signed_attrs"]:
        if attribute["type"].native == "signing_time":
            return attribute["values"][0].native
    unsigned_attrs = signer_info["unsigned_attrs"]
    if not unsigned_attrs.native:
        return None
    for attribute in unsigned_attrs:
        if attribute["type"].native != "signature_time_stamp_token":
            continue
        token = attribute["values"][0]
        token_signer_info = token["content"]["signer_infos"][0]
        for token_attribute in token_signer_info["signed_attrs"]:
            if token_attribute["type"].native == "signing_time":
                return token_attribute["values"][0].native
    return None


def _certificate_report(
    certificate: x509.Certificate,
    signature_date: datetime | None,
    revocation_checker: RevocationChecker,
) -> dict[str, Any]:
    validation_time = signature_date or datetime.now(timezone.utc)
    not_before = certificate.not_valid_before_utc
    not_after = certificate.not_valid_after_utc
    is_time_valid = not_before <= validation_time <= not_after
    is_revoked = revocation_checker.is_revoked(certificate)
    return {
        "valid": is_time_valid and not is_revoked,
        "valid_at": validation_time.isoformat(),
        "not_before": not_before.isoformat(),
        "not_after": not_after.isoformat(),
        "revoked": is_revoked,
        "serial_number": str(certificate.serial_number),
        "days_remaining": max((certificate.not_valid_after_utc - validation_time).days, 0),
    }


def _signer_identity(certificate: x509.Certificate) -> dict[str, Any]:
    subject = certificate.subject
    return {
        "common_name": _subject_value(subject, x509.oid.NameOID.COMMON_NAME),
        "email": _subject_value(subject, x509.oid.NameOID.EMAIL_ADDRESS),
        "organization": _subject_value(subject, x509.oid.NameOID.ORGANIZATION_NAME),
        "serial_number": str(certificate.serial_number),
        "issuer": certificate.issuer.rfc4514_string(),
    }


def _subject_value(name: x509.Name, oid: x509.ObjectIdentifier) -> str | None:
    values = name.get_attributes_for_oid(oid)
    return values[0].value if values else None
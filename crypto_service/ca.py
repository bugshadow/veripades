from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID


@dataclass(frozen=True)
class CertificateAuthority:
    name: str
    private_key: ec.EllipticCurvePrivateKey
    certificate: x509.Certificate


def _new_ec_private_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(ec.SECP256R1())


def _subject(common_name: str, organization: str = "POC Signature Electronique") -> x509.Name:
    return x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "MA"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, organization),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ]
    )


def create_root_ca(common_name: str = "POC Root CA", validity_days: int = 3650) -> CertificateAuthority:
    key = _new_ec_private_key()
    subject = _subject(common_name)
    now = datetime.now(timezone.utc)

    # La Root CA est auto-signee et limitee aux usages d'autorite pour eviter
    # qu'elle soit acceptee comme certificat utilisateur dans le reste du POC.
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=validity_days))
        .add_extension(x509.BasicConstraints(ca=True, path_length=1), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=False,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .sign(private_key=key, algorithm=hashes.SHA256())
    )

    return CertificateAuthority(name=common_name, private_key=key, certificate=certificate)


def create_intermediate_ca(
    root_ca: CertificateAuthority,
    common_name: str = "POC Intermediate CA",
    validity_days: int = 1825,
) -> CertificateAuthority:
    key = _new_ec_private_key()
    subject = _subject(common_name)
    now = datetime.now(timezone.utc)

    # L'intermediaire recoit le droit de signer des certificats finaux, ce qui
    # garde la Root CA hors ligne dans un vrai systeme et reduit l'impact d'une compromission.
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(root_ca.certificate.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=validity_days))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=False,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(root_ca.private_key.public_key()),
            critical=False,
        )
        .sign(private_key=root_ca.private_key, algorithm=hashes.SHA256())
    )

    return CertificateAuthority(name=common_name, private_key=key, certificate=certificate)

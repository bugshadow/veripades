from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from ca import CertificateAuthority


@dataclass(frozen=True)
class IssuedCertificate:
    common_name: str
    private_key: ec.EllipticCurvePrivateKey
    certificate: x509.Certificate


def issue_signer_certificate(
    intermediate_ca: CertificateAuthority,
    common_name: str,
    email: str,
    validity_days: int = 365,
) -> IssuedCertificate:
    key = ec.generate_private_key(ec.SECP256R1())
    now = datetime.now(timezone.utc)
    subject = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "MA"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "POC Signature Electronique"),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
            x509.NameAttribute(NameOID.EMAIL_ADDRESS, email),
        ]
    )

    # Le certificat utilisateur n'a pas le droit de signer d'autres certificats :
    # il sert seulement a signer du contenu, ce qui bloque une escalation PKI accidentelle.
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(intermediate_ca.certificate.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=validity_days))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.SubjectAlternativeName([x509.RFC822Name(email)]), critical=False)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(intermediate_ca.private_key.public_key()),
            critical=False,
        )
        .sign(private_key=intermediate_ca.private_key, algorithm=hashes.SHA256())
    )

    return IssuedCertificate(common_name=common_name, private_key=key, certificate=certificate)

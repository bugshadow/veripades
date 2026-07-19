from __future__ import annotations

from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_private_key_encrypted(
    private_key: ec.EllipticCurvePrivateKey,
    destination: Path,
    passphrase: str,
) -> Path:
    ensure_directory(destination.parent)

    # Le PEM est chiffre au moment de l'ecriture pour eviter qu'un simple acces
    # au disque donne directement la capacite d'emettre ou d'usurper un certificat.
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.BestAvailableEncryption(passphrase.encode("utf-8")),
    )
    destination.write_bytes(pem)
    return destination


def save_certificate(certificate: x509.Certificate, destination: Path) -> Path:
    ensure_directory(destination.parent)
    destination.write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    return destination


def save_certificate_chain(certificates: list[x509.Certificate], destination: Path) -> Path:
    ensure_directory(destination.parent)

    # La chaine est stockee dans l'ordre certificat utilisateur -> intermediaire -> root,
    # car c'est l'ordre le plus pratique pour verifier ou embarquer une chaine de signature.
    pem_chain = b"".join(
        certificate.public_bytes(serialization.Encoding.PEM) for certificate in certificates
    )
    destination.write_bytes(pem_chain)
    return destination


def load_private_key_encrypted(source: Path, passphrase: str) -> ec.EllipticCurvePrivateKey:
    key = serialization.load_pem_private_key(source.read_bytes(), password=passphrase.encode("utf-8"))
    if not isinstance(key, ec.EllipticCurvePrivateKey):
        raise TypeError("La cle chargee n'est pas une cle privee ECDSA.")
    return key


def load_certificate(source: Path) -> x509.Certificate:
    return x509.load_pem_x509_certificate(source.read_bytes())

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ec

from ca import CertificateAuthority, create_intermediate_ca, create_root_ca
from certs import IssuedCertificate, issue_signer_certificate
from storage import save_certificate, save_certificate_chain, save_private_key_encrypted


ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts" / "pki"
PASSPHRASE = "poc-dev-passphrase-change-me"


def _configure_utf8_console() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

def _status(label: str, success: bool, details: str = "") -> bool:
    icon = "<OK>" if success else "?"
    suffix = f" - {details}" if details else ""
    print(f"{icon} {label}{suffix}")
    return success


def _is_currently_valid(certificate: x509.Certificate) -> bool:
    now = datetime.now(timezone.utc)
    return certificate.not_valid_before_utc <= now <= certificate.not_valid_after_utc


def _verify_certificate_signature(child: x509.Certificate, issuer: x509.Certificate) -> bool:
    try:
        issuer.public_key().verify(
            child.signature,
            child.tbs_certificate_bytes,
            ec.ECDSA(child.signature_hash_algorithm),
        )
        return True
    except InvalidSignature:
        return False


def _has_ca_constraints(certificate: x509.Certificate, expected_ca: bool) -> bool:
    basic_constraints = certificate.extensions.get_extension_for_class(x509.BasicConstraints).value
    return basic_constraints.ca is expected_ca


def _save_generated_files(
    root_ca: CertificateAuthority,
    intermediate_ca: CertificateAuthority,
    signer: IssuedCertificate,
) -> None:
    # Les artefacts de test sont ecrits pour rendre le POC inspectable a la main :
    # on peut ouvrir les certificats PEM, mais les cles privees restent chiffrees.
    save_private_key_encrypted(root_ca.private_key, ARTIFACTS_DIR / "root-ca.key.pem", PASSPHRASE)
    save_certificate(root_ca.certificate, ARTIFACTS_DIR / "root-ca.cert.pem")
    save_private_key_encrypted(
        intermediate_ca.private_key,
        ARTIFACTS_DIR / "intermediate-ca.key.pem",
        PASSPHRASE,
    )
    save_certificate(intermediate_ca.certificate, ARTIFACTS_DIR / "intermediate-ca.cert.pem")
    save_private_key_encrypted(signer.private_key, ARTIFACTS_DIR / "signer.key.pem", PASSPHRASE)
    save_certificate(signer.certificate, ARTIFACTS_DIR / "signer.cert.pem")
    save_certificate_chain(
        [signer.certificate, intermediate_ca.certificate, root_ca.certificate],
        ARTIFACTS_DIR / "signer-chain.pem",
    )


def main() -> int:
    _configure_utf8_console()
    root_ca = create_root_ca()
    intermediate_ca = create_intermediate_ca(root_ca)
    signer = issue_signer_certificate(
        intermediate_ca,
        common_name="Utilisateur Test",
        email="signataire.test@example.local",
    )
    _save_generated_files(root_ca, intermediate_ca, signer)

    print("Mini-PKI POC - verification manuelle")
    print(f"Artefacts: {ARTIFACTS_DIR}")
    print("")

    checks = [
        _status("Root CA generee en ECDSA P-256", root_ca.private_key.curve.name == "secp256r1"),
        _status("Root CA auto-signee", _verify_certificate_signature(root_ca.certificate, root_ca.certificate)),
        _status("Root CA marquee comme autorite", _has_ca_constraints(root_ca.certificate, expected_ca=True)),
        _status("Intermediaire signe par la Root CA", _verify_certificate_signature(intermediate_ca.certificate, root_ca.certificate)),
        _status("Intermediaire marque comme autorite", _has_ca_constraints(intermediate_ca.certificate, expected_ca=True)),
        _status("Certificat utilisateur signe par l'intermediaire", _verify_certificate_signature(signer.certificate, intermediate_ca.certificate)),
        _status("Certificat utilisateur non-CA", _has_ca_constraints(signer.certificate, expected_ca=False)),
        _status("Certificat utilisateur en cours de validite", _is_currently_valid(signer.certificate)),
        _status("Chaine sauvegardee sur disque", (ARTIFACTS_DIR / "signer-chain.pem").exists()),
    ]

    print("")
    if all(checks):
        print("Resultat final: chaine de confiance valide pour le POC.")
        return 0

    print("Resultat final: chaine de confiance invalide, verifier les lignes en echec.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

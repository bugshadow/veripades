from __future__ import annotations

import logging
import sys
from pathlib import Path

from ca import create_intermediate_ca, create_root_ca
from certs import issue_signer_certificate
from signature import SignerIdentity, SignatureError, signer_document
from storage import save_certificate, save_private_key_encrypted

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts" / "signature"
PASSPHRASE = "poc-dev-passphrase-change-me"


def _configure_console_and_logs() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")


def _write_minimal_pdf(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        b"4 0 obj\n<< /Length 74 >>\nstream\nBT /F1 12 Tf 40 90 Td (Document de test pour signature PAdES) Tj ET\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    data = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for item in objects:
        offsets.append(len(data))
        data.extend(item)
    xref_offset = len(data)
    data.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    data.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        data.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    data.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    path.write_bytes(bytes(data))


def _prepare_signer_identity() -> SignerIdentity:
    root_ca = create_root_ca()
    intermediate_ca = create_intermediate_ca(root_ca)
    signer = issue_signer_certificate(
        intermediate_ca,
        common_name="Utilisateur Test Signature PDF",
        email="signataire.pdf@example.local",
    )

    root_cert = ARTIFACTS_DIR / "root-ca.cert.pem"
    intermediate_cert = ARTIFACTS_DIR / "intermediate-ca.cert.pem"
    signer_cert = ARTIFACTS_DIR / "signer.cert.pem"
    signer_key = ARTIFACTS_DIR / "signer.key.pem"

    save_certificate(root_ca.certificate, root_cert)
    save_certificate(intermediate_ca.certificate, intermediate_cert)
    save_certificate(signer.certificate, signer_cert)
    save_private_key_encrypted(signer.private_key, signer_key, PASSPHRASE)

    return SignerIdentity(
        private_key_path=signer_key,
        certificate_path=signer_cert,
        chain_paths=[intermediate_cert, root_cert],
        passphrase=PASSPHRASE,
        signer_id="utilisateur-test-signature-pdf",
    )


def main() -> int:
    _configure_console_and_logs()
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    input_pdf = ARTIFACTS_DIR / "document-test.pdf"
    output_pdf = ARTIFACTS_DIR / "document-test-signed.pdf"
    _write_minimal_pdf(input_pdf)
    signer_identity = _prepare_signer_identity()

    try:
        # Cet appel declenche signer_document(), qui construit le signer pyHanko,
        # ajoute une signature PAdES avec timestamp local simule, puis ecrit un nouveau PDF.
        result = signer_document(input_pdf, signer_identity, output_path=output_pdf)
    except SignatureError as exc:
        print(f"Signature impossible: {exc.user_message}")
        print(f"Diagnostic technique: {exc.technical_message}")
        return 1

    print("PDF signe avec succes")
    print(f"PDF source : {input_pdf}")
    print(f"PDF signe  : {result.signed_pdf_path}")
    print(f"SHA-256 avant signature : {result.before_sha256}")
    print(f"SHA-256 apres signature : {result.after_sha256}")
    print("Note: les hashs sont differents car la signature ajoute un ByteRange et un CMS au PDF.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
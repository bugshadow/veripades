from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

from signature import signer_document
from test_sign_pdf import ARTIFACTS_DIR, _prepare_signer_identity, _write_minimal_pdf
from verification import verifier_document


def _configure_console_and_logs() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")


def _tamper_one_signed_byte(source: Path, destination: Path, byte_range: list[int]) -> int:
    data = bytearray(source.read_bytes())
    start, length = byte_range[0], byte_range[1]
    offset = start + min(100, length - 1)

    # On modifie volontairement un octet dans une zone couverte par le ByteRange :
    # le PDF peut encore contenir le CMS original, mais son hash ne correspondra plus.
    data[offset] ^= 0x01
    destination.write_bytes(bytes(data))
    return offset


def _print_result(title: str, report: dict) -> None:
    icon = "<OK>" if report["is_integral"] else "?"
    print(f"{icon} {title}: {report['message']}")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> int:
    _configure_console_and_logs()
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    input_pdf = ARTIFACTS_DIR / "verification-source.pdf"
    signed_pdf = ARTIFACTS_DIR / "verification-signed.pdf"
    tampered_pdf = ARTIFACTS_DIR / "verification-signed-tampered.pdf"

    _write_minimal_pdf(input_pdf)
    signer_identity = _prepare_signer_identity()
    signer_document(input_pdf, signer_identity, output_path=signed_pdf)

    valid_report = verifier_document(signed_pdf)
    _print_result("Verification du PDF signe", valid_report)

    modified_offset = _tamper_one_signed_byte(signed_pdf, tampered_pdf, valid_report["byte_range"])
    print(f"\nOctet modifie volontairement a l'offset {modified_offset}.\n")

    tampered_report = verifier_document(tampered_pdf)
    _print_result("Verification apres alteration", tampered_report)

    return 0 if valid_report["is_integral"] and not tampered_report["is_integral"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
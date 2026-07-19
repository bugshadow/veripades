import logging
import os
import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from ca import create_intermediate_ca, create_root_ca
from certs import issue_signer_certificate
from signature import SignerIdentity, signer_document
from storage import (
    load_private_key_encrypted,
    save_certificate,
    save_certificate_chain,
    save_private_key_encrypted,
)
from verification import verifier_document


app = FastAPI(title="Microservice Cryptographique", description="POC Signature Electronique")
logging.basicConfig(level=logging.INFO)

UPLOAD_DIR = Path("/app/storage")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

RUNTIME_PKI_DIR = Path("/tmp/poc-signature-pki")
ROOT_CERT_PATH = RUNTIME_PKI_DIR / "root-ca.cert.pem"
INTERMEDIATE_CERT_PATH = RUNTIME_PKI_DIR / "intermediate-ca.cert.pem"
SIGNER_CERT_PATH = RUNTIME_PKI_DIR / "signer.cert.pem"
SIGNER_KEY_PATH = RUNTIME_PKI_DIR / "signer.key.pem"
SIGNER_CHAIN_PATH = RUNTIME_PKI_DIR / "signer-chain.pem"


def get_required_pki_passphrase() -> str:
    passphrase = os.environ.get("PKI_PASSPHRASE")
    if not passphrase:
        raise RuntimeError("PKI_PASSPHRASE manquant dans l'environnement")
    return passphrase


def ensure_runtime_pki(passphrase: str, signer_id: str) -> SignerIdentity:
    required_files = [ROOT_CERT_PATH, INTERMEDIATE_CERT_PATH, SIGNER_CERT_PATH, SIGNER_KEY_PATH]
    if not all(path.exists() for path in required_files) or not private_key_matches_passphrase(passphrase):
        generate_runtime_pki(passphrase)

    return SignerIdentity(
        private_key_path=SIGNER_KEY_PATH,
        certificate_path=SIGNER_CERT_PATH,
        chain_paths=[INTERMEDIATE_CERT_PATH, ROOT_CERT_PATH],
        passphrase=passphrase,
        signer_id=signer_id,
    )


def private_key_matches_passphrase(passphrase: str) -> bool:
    if not SIGNER_KEY_PATH.exists():
        return False
    try:
        load_private_key_encrypted(SIGNER_KEY_PATH, passphrase)
        return True
    except Exception:
        return False


def generate_runtime_pki(passphrase: str) -> None:
    logging.info("Generation de la PKI de test runtime pour le POC")
    RUNTIME_PKI_DIR.mkdir(parents=True, exist_ok=True)

    root_ca = create_root_ca()
    intermediate_ca = create_intermediate_ca(root_ca)
    signer = issue_signer_certificate(
        intermediate_ca,
        common_name="Utilisateur Test Signature PDF",
        email="signataire.pdf@example.local",
    )

    save_certificate(root_ca.certificate, ROOT_CERT_PATH)
    save_certificate(intermediate_ca.certificate, INTERMEDIATE_CERT_PATH)
    save_certificate(signer.certificate, SIGNER_CERT_PATH)
    save_certificate_chain([signer.certificate, intermediate_ca.certificate, root_ca.certificate], SIGNER_CHAIN_PATH)
    save_private_key_encrypted(signer.private_key, SIGNER_KEY_PATH, passphrase)


async def resolve_pdf_path(file: UploadFile | None, file_path: str | None) -> Path:
    if file_path:
        path = Path(file_path)
        if not path.is_absolute():
            raise ValueError("file_path doit etre absolu dans le volume partage")
        return path

    if not file:
        raise ValueError("Un fichier PDF ou file_path est requis")

    input_path = UPLOAD_DIR / file.filename
    with input_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return input_path


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/sign")
async def sign_pdf(
    signer_id: str = Form(...),
    file: UploadFile | None = File(default=None),
    file_path: str | None = Form(default=None),
):
    try:
        passphrase = get_required_pki_passphrase()
        input_path = await resolve_pdf_path(file, file_path)
        identity = ensure_runtime_pki(passphrase, signer_id)
        result = await run_in_threadpool(signer_document, input_path, identity)
        return {
            "signed_pdf_path": str(result.signed_pdf_path),
            "before_sha256": result.before_sha256,
            "after_sha256": result.after_sha256,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify")
async def verify_pdf(
    file: UploadFile | None = File(default=None),
    file_path: str | None = Form(default=None),
):
    try:
        input_path = await resolve_pdf_path(file, file_path)
        return await run_in_threadpool(verifier_document, input_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
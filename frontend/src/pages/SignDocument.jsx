import { useRef, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { ButtonStamp } from '../components/ui/ButtonStamp';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { SealStamp } from '../components/ui/SealStamp';
import { DocumentScanner } from '../components/documents/DocumentScanner';
import { randomSealRotation } from '../utils/certificate';
import api, { getApiErrorMessage } from '../lib/api';

const minimumScanTime = 900;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const SignDocument = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [document, setDocument] = useState(null);
  const [signatureDetails, setSignatureDetails] = useState(null);
  const [sealRotation, setSealRotation] = useState(-8);
  const fileInputRef = useRef(null);

  const uploadForHash = async (selected) => {
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setError(new Error('Format invalide. Seuls les fichiers PDF sont acceptes.'));
      setSuccess(null);
      return;
    }

    setFile(selected);
    setStatus('UPLOADING');
    setDocument(null);
    setSignatureDetails(null);
    setError(null);
    setSuccess(null);

    try {
      const startedAt = performance.now();
      const formData = new FormData();
      formData.append('file', selected);
      const uploadResponse = await api.post('/documents', formData);
      const elapsed = performance.now() - startedAt;
      if (elapsed < minimumScanTime) await wait(minimumScanTime - elapsed);
      setDocument(uploadResponse.data);
      setStatus('READY');
      setSuccess(`Empreinte SHA-256 lue pour ${uploadResponse.data.originalName}.`);
    } catch (err) {
      setError(new Error(getApiErrorMessage(err)));
      setStatus('IDLE');
    }
  };

  const handleFileChange = (event) => {
    uploadForHash(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (status === 'UPLOADING' || status === 'SIGNING') return;
    uploadForHash(event.dataTransfer.files?.[0]);
  };

  const handleProcess = async () => {
    if (!document) return;
    setStatus('SIGNING');
    setError(null);
    setSuccess(null);
    setSignatureDetails(null);

    try {
      const signResponse = await api.post(`/documents/${document.id}/sign`, {
        signerId: 'local-test-signer',
      });
      setSealRotation(randomSealRotation());
      setSignatureDetails(signResponse.data.details);
      window.localStorage.setItem('cachet:freshDocumentId', document.id);
      setSuccess('Document signe cryptographiquement avec succes.');
      setStatus('SUCCESS');
    } catch (err) {
      setError(new Error(getApiErrorMessage(err)));
      setStatus('READY');
    }
  };

  const resetForm = () => {
    setFile(null);
    setStatus('IDLE');
    setError(null);
    setSuccess(null);
    setDocument(null);
    setSignatureDetails(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = status === 'UPLOADING' || status === 'SIGNING';
  const scannerPhase = status === 'UPLOADING' ? 'uploading' : status === 'SIGNING' ? 'looping' : 'idle';

  return (
    <MainLayout>
      <header style={{ marginBottom: '3rem' }}>
        <h1>Apposer un Sceau</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Televersez un document PDF pour lire son empreinte, puis apposer le cachet cryptographique.
        </p>
      </header>

      <div className="sign-workbench">
        <div className="card-kraft sign-workbench__main">
          <ApiFeedback error={error} success={success} />

          {status === 'SUCCESS' ? (
            <div className="completion-panel">
              <div className="completion-panel__status">[OPERATION TERMINEE]</div>
              <h2>Acte Scelle avec Succes</h2>
              <p>Le document {file.name} a ete signe cryptographiquement.</p>
              {document && <code>ID document : {document.id}</code>}
              {signatureDetails?.after_sha256 && (
                <div className="completion-panel__hash">
                  <span>SHA-256 signe</span>
                  <code>{signatureDetails.after_sha256}</code>
                </div>
              )}
              <ButtonStamp onClick={resetForm}>NOUVEAU DOCUMENT</ButtonStamp>
            </div>
          ) : (
            <>
              <div
                className="upload-zone upload-zone--scanner"
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && !isLoading) fileInputRef.current?.click();
                }}
                style={{ borderColor: file ? 'var(--color-text-main)' : 'var(--color-border)' }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isLoading}
                />
                {file ? (
                  <DocumentScanner file={file} phase={scannerPhase} hash={document?.beforeHash} />
                ) : (
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      Cliquer ou deposer un fichier PDF
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      Le scan calcule l'empreinte SHA-256 reelle via l'API.
                    </div>
                  </div>
                )}
              </div>

              <div className="sign-workbench__actions">
                <div className="certificate-strength">{'[\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591] ECDSA P-256 \u00b7 certificat POC'}</div>
                <ButtonStamp primary={true} disabled={!document || isLoading} isLoading={status === 'SIGNING'} onClick={handleProcess}>
                  SCELLER L'ACTE
                </ButtonStamp>
              </div>
            </>
          )}
        </div>

        <aside className="sign-workbench__seal">
          <h3>Statut du cachet</h3>
          <SealStamp
            state={status === 'SUCCESS' ? 'valid' : status === 'SIGNING' ? 'progress' : 'pending'}
            impact={status === 'SUCCESS'}
            rotation={sealRotation}
          />
        </aside>
      </div>
    </MainLayout>
  );
};
import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { ButtonStamp } from '../components/ui/ButtonStamp';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { SealStamp } from '../components/ui/SealStamp';
import { AnimatedHash } from '../components/ui/AnimatedHash';
import { HashComparator } from '../components/documents/HashComparator';
import { InspectorPanel } from '../components/documents/InspectorPanel';
import { certificateStrengthLabel, randomSealRotation } from '../utils/certificate';
import { useAuth } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../lib/api';

export const VerifyDocument = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [manualDocumentId, setManualDocumentId] = useState('');
  const [verificationFile, setVerificationFile] = useState(null);
  const [mode, setMode] = useState('id');
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(Boolean(user));
  const [isVerifying, setIsVerifying] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sealRotation, setSealRotation] = useState(-8);

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setIsLoadingDocuments(false);
      return;
    }

    const fetchDocuments = async () => {
      setIsLoadingDocuments(true);
      setError(null);
      try {
        const response = await api.get('/documents');
        setDocuments(response.data);
        const firstSigned = response.data.find((doc) => doc.status === 'SIGNED');
        if (firstSigned) {
          setSelectedDocumentId(firstSigned.id);
          setManualDocumentId(firstSigned.id);
        }
        setSuccess(`${response.data.length} document(s) disponibles pour verification.`);
      } catch (err) {
        setError(new Error(getApiErrorMessage(err)));
      } finally {
        setIsLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [user]);

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId);
  const idToVerify = selectedDocumentId || manualDocumentId.trim();

  const handleVerify = async () => {
    if (mode === 'file' && !verificationFile) return;
    if (mode === 'id' && !idToVerify) return;

    setIsVerifying(true);
    setReport(null);
    setError(null);
    setSuccess(null);
    setInspectorOpen(false);

    try {
      const response = mode === 'file'
        ? await api.post('/documents/verify', buildVerificationFormData(verificationFile), {
            publicRequest: true,
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        : await api.post(`/documents/${idToVerify}/verify`, undefined, { publicRequest: true });

      setReport(response.data);
      setSealRotation(randomSealRotation());
      setSuccess(response.data.is_integral ? 'Verification terminee : document authentique.' : 'Verification terminee : alteration detectee.');
    } catch (err) {
      setError(new Error(getApiErrorMessage(err)));
    } finally {
      setIsVerifying(false);
    }
  };

  const isBusy = isLoadingDocuments || isVerifying;
  const altered = report && !report.is_integral;
  const canVerify = mode === 'file' ? Boolean(verificationFile) : Boolean(idToVerify);

  return (
    <MainLayout>
      <header style={{ marginBottom: '3rem' }}>
        <h1>Verification d'Authenticite</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Analyse cryptographique du cachet et de l'integrite du contenu d'un document signe.
        </p>
      </header>

      <div className="verify-workbench">
        <div className="verify-workbench__main">
          <div className="card-kraft">
            <ApiFeedback error={error} success={success} />
            <div className="verify-controls">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Mode de verification</label>
                <select
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value);
                    setReport(null);
                    setSuccess(null);
                    setInspectorOpen(false);
                  }}
                  disabled={isBusy}
                >
                  <option value="id">Verifier par ID document</option>
                  <option value="file">Verifier un PDF recu</option>
                </select>
              </div>

              {mode === 'id' ? (
                user && documents.length > 0 ? (
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Document signe a verifier</label>
                    <select
                      value={selectedDocumentId}
                      onChange={(event) => {
                        setSelectedDocumentId(event.target.value);
                        setManualDocumentId(event.target.value);
                        setReport(null);
                        setSuccess(null);
                        setInspectorOpen(false);
                      }}
                      disabled={isBusy}
                    >
                      <option value="">Selectionner un document</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.originalName} - {doc.status}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>ID document a verifier</label>
                    <input
                      value={manualDocumentId}
                      onChange={(event) => {
                        setManualDocumentId(event.target.value);
                        setSelectedDocumentId('');
                        setReport(null);
                        setSuccess(null);
                        setInspectorOpen(false);
                      }}
                      disabled={isBusy}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                )
              ) : (
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>PDF signe recu</label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={isBusy}
                    onChange={(event) => {
                      setVerificationFile(event.target.files?.[0] || null);
                      setReport(null);
                      setSuccess(null);
                      setInspectorOpen(false);
                    }}
                  />
                </div>
              )}

              <ButtonStamp primary={true} disabled={!canVerify || isBusy} isLoading={isVerifying} onClick={handleVerify}>
                LANCER L'AUDIT
              </ButtonStamp>
            </div>
            {mode === 'id' && selectedDocument && <div className="document-id-line">ID : {selectedDocument.id}</div>}
          </div>

          <div className="card-kraft verification-report">
            <ApiFeedback isLoading={isBusy} />

            {!isBusy && report ? (
              <div>
                <div className="verification-report__head">
                  <div>
                    <h3>Journal d'Audit</h3>
                    <span className={report.is_integral ? 'verdict-text verdict-text--valid' : 'verdict-text verdict-text--invalid'}>
                      {report.is_integral ? '[SUCCES] Integrite cryptographique validee' : '[ALERTE] Faille d integrite detectee'}
                    </span>
                  </div>
                  <button className="inspector-toggle" onClick={() => setInspectorOpen((value) => !value)}>
                    {'\u2315'} INSPECTEUR
                  </button>
                </div>

                <HashComparator before={report.cms_message_digest || report.integrity || ''} after={report.computed_sha256 || report.integrity || ''} altered={altered} animate={true} />

                <div className="report-grid">
                  <div>
                    <strong>IDENTITE DU SIGNATAIRE</strong>
                    <span>CN=<AnimatedHash value={report.signer?.common_name || '-'} active={true} /></span>
                    <small>O={report.signer?.organization || '-'}</small>
                  </div>
                  <div>
                    <strong>DATE DE SIGNATURE</strong>
                    <span><AnimatedHash value={report.signature_date || '-'} active={true} /></span>
                    <small>{certificateStrengthLabel(report)}</small>
                  </div>
                  <div>
                    <strong>CERTIFICAT</strong>
                    <span>{report.certificate_chain?.every((certificate) => certificate.valid) ? 'Chaine valide et non revoquee' : 'Chaine invalide, expiree ou revoquee'}</span>
                    <small>SN: {report.signer?.serial_number || '-'}</small>
                  </div>
                </div>

                {inspectorOpen && <InspectorPanel report={report} />}
              </div>
            ) : (
              <div className="empty-audit-state">
                En attente d un document a analyser...
              </div>
            )}
          </div>
        </div>

        <aside className="verify-workbench__seal">
          <h3>Verdict</h3>
          <SealStamp
            state={report ? (report.is_integral ? 'valid' : 'invalid') : 'pending'}
            impact={Boolean(report)}
            cracked={Boolean(report && !report.is_integral)}
            rotation={sealRotation}
            size="lg"
          />

          {report && (
            <div className={report.is_integral ? 'verdict-title verdict-title--valid' : 'verdict-title verdict-title--invalid'}>
              {report.is_integral ? 'ACTE AUTHENTIQUE' : 'ACTE ALTERE'}
            </div>
          )}
        </aside>
      </div>
    </MainLayout>
  );
};

const buildVerificationFormData = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};


import { FileSearch, Hash, SearchCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AnimatedHash } from '../components/ui/AnimatedHash';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { ButtonStamp } from '../components/ui/ButtonStamp';
import { FileDropzone } from '../components/ui/FileDropzone';
import { SealStamp } from '../components/ui/SealStamp';
import api, { getApiErrorMessage } from '../lib/api';

const sha256 = async (file) => {
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const VerifyDocument = () => {
  const [mode, setMode] = useState('file');
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState('');
  const [report, setReport] = useState(null);
  const [localHash, setLocalHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationKey, setVerificationKey] = useState(0);

  const selectFile = (selected) => {
    setError(''); setReport(null); setLocalHash('');
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) { setError('Le document à vérifier doit être un fichier PDF.'); setFile(null); return; }
    if (selected.size > 10 * 1024 * 1024) { setError('Le document dépasse la limite publique de 10 Mo.'); setFile(null); return; }
    setFile(selected);
  };

  const verify = async () => {
    if ((mode === 'file' && !file) || (mode === 'id' && !documentId.trim())) return;
    setLoading(true); setError(''); setReport(null); setLocalHash('');
    try {
      let response;
      if (mode === 'file') {
        const [hash, result] = await Promise.all([sha256(file), (() => { const body = new FormData(); body.append('file', file); return api.post('/documents/verify', body, { publicRequest: true }); })()]);
        setLocalHash(hash); response = result;
      } else response = await api.post(`/documents/${documentId.trim()}/verify`, null, { publicRequest: true });
      setReport(response.data); setVerificationKey((value) => value + 1);
    } catch (requestError) {
      const status = requestError?.response?.status;
      setError(status === 404 ? 'Document introuvable ou non vérifiable.' : getApiErrorMessage(requestError));
    } finally { setLoading(false); }
  };

  const valid = report?.is_integral === true;
  const sealState = loading ? 'progress' : report ? (valid ? 'valid' : 'invalid') : 'pending';

  return (
    <PublicLayout className="verify-page">
      <section className="public-tool-heading dossier-grid"><aside className="binder-margin"><span>CONTRÔLE</span><strong>VER-03</strong><small>ACCÈS · PUBLIC</small></aside><div><span className="section-index">VÉRIFICATION PUBLIQUE · SANS COMPTE</span><h1>Contrôler un cachet numérique</h1><p>Soumettez le PDF reçu ou la référence partagée. Le rapport public exclut les données du propriétaire.</p></div></section>
      <section className="verify-console">
        <div className="verify-console__controls">
          <div className="segmented-control" role="tablist" aria-label="Mode de vérification"><button type="button" role="tab" aria-selected={mode === 'file'} className={mode === 'file' ? 'is-active' : ''} onClick={() => { setMode('file'); setReport(null); setError(''); }}><FileSearch size={17} />PDF reçu</button><button type="button" role="tab" aria-selected={mode === 'id'} className={mode === 'id' ? 'is-active' : ''} onClick={() => { setMode('id'); setReport(null); setError(''); }}><SearchCheck size={17} />Identifiant</button></div>
          <ApiFeedback error={error} />
          {mode === 'file' ? <FileDropzone file={file} onFile={selectFile} disabled={loading} title="Déposer le PDF signé" description="Le fichier est vérifié publiquement, sans ouvrir de session" /> : <label className="document-id-field"><span>ID DU DOCUMENT</span><input value={documentId} onChange={(event) => { setDocumentId(event.target.value); setReport(null); }} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>}
          <ButtonStamp primary icon={ShieldCheck} isLoading={loading} loadingLabel="Analyse cryptographique" disabled={mode === 'file' ? !file : !documentId.trim()} onClick={verify}>Vérifier le document</ButtonStamp>
          <small className="rate-note">ENDPOINT PUBLIC · LIMITE 20 REQUÊTES / MINUTE / IP</small>
        </div>
        <aside className={`verification-verdict ${report ? (valid ? 'verification-verdict--valid' : 'verification-verdict--invalid') : ''}`}>
          <span className="section-index">VERDICT</span><SealStamp state={sealState} size="xl" impact={Boolean(report)} rotation={valid ? -8.5 : -5.5} />
          <h2>{loading ? 'Analyse en cours' : report ? (valid ? 'Acte authentique' : 'Altération détectée') : 'En attente de preuve'}</h2>
          <p>{loading ? 'Lecture du conteneur PAdES et de la chaîne de certificats.' : report?.message || 'Aucun document n’a encore été soumis.'}</p>
        </aside>
      </section>
      {report && <section className="verification-report" key={verificationKey}><div className="verification-report__heading"><span className="section-index">RAPPORT PUBLIC FILTRÉ</span><h2>Résultat de l’inspection</h2></div><div className="report-ledger"><div className="report-ledger__hash"><span><Hash size={16} /> EMPREINTE SHA-256 DU FICHIER SOUMIS</span>{localHash ? <code><AnimatedHash value={localHash} active chunk={8} /></code> : <p>Non exposée par l’API publique lors d’une vérification par identifiant.</p>}</div><div><span>INTÉGRITÉ</span><strong>{report.integrity || (valid ? 'VALIDE' : 'INVALIDE')}</strong></div><div><span>SIGNATAIRE DU CERTIFICAT</span><strong>{report.signer?.common_name || 'Non exposé'}</strong><small>{report.signer?.organization || ''}</small></div><div><span>DATE DE SIGNATURE</span><strong>{report.signature_date || 'Non exposée'}</strong></div><div><span>NUMÉRO DE SÉRIE</span><code>{report.signer?.serial_number || 'Non exposé'}</code></div><div><span>CHAÎNE PKI</span><strong>{report.certificate_chain?.length || 0} certificat(s)</strong></div></div>{report.certificate_chain?.length > 0 && <div className="certificate-ledger">{report.certificate_chain.map((certificate, index) => <div key={`${certificate.serial_number}-${index}`}><span>{certificate.role || `CERTIFICAT ${index + 1}`}</span><strong>{certificate.common_name || 'Sujet non exposé'}</strong><small>{certificate.valid ? 'VALIDE' : 'À CONTRÔLER'} · émis par {certificate.issuer || '—'} · {certificate.days_remaining ?? '—'} jours restants</small></div>)}</div>}</section>}
    </PublicLayout>
  );
};

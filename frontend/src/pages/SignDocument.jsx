import { Check, Copy, Download, FileCheck2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { ButtonStamp } from '../components/ui/ButtonStamp';
import { FileDropzone } from '../components/ui/FileDropzone';
import { SealStamp } from '../components/ui/SealStamp';
import { useAuth } from '../context/AuthContext';
import api, { copyToClipboard, downloadFile, getApiErrorMessage } from '../lib/api';

export const SignDocument = () => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [document, setDocument] = useState(null);
  const [details, setDetails] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const selectFile = async (selected) => {
    setError(''); setDetails(null); setDocument(null);
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) { setError('Le document doit être un fichier PDF.'); setFile(null); return; }
    if (selected.size > 10 * 1024 * 1024) { setError('Le document dépasse la limite de 10 Mo.'); setFile(null); return; }
    setFile(selected); setPhase('uploading');
    try {
      const body = new FormData(); body.append('file', selected);
      const response = await api.post('/documents', body);
      setDocument(response.data); setPhase('ready');
    } catch (requestError) { setError(await getApiErrorMessage(requestError)); setPhase('idle'); }
  };

  const sign = async () => {
    if (!document || !user) return;
    setError(''); setPhase('signing');
    try {
      const response = await api.post(`/documents/${document.id}/sign`, { signerId: user.id });
      setDetails(response.data.details || {}); setPhase('success');
    } catch (requestError) { setError(await getApiErrorMessage(requestError)); setPhase('ready'); }
  };

  const reset = () => { setFile(null); setDocument(null); setDetails(null); setError(''); setCopied(false); setPhase('idle'); };

  const downloadSigned = async () => {
    if (!document) return;
    const baseName = (file?.name || 'document').replace(/\.pdf$/i, '');
    const result = await downloadFile(`/documents/${document.id}/download`, `${baseName}-signe.pdf`);
    if (!result.success) setError(result.message);
  };

  const copyDocumentId = async () => {
    if (!document?.id) return;
    const ok = await copyToClipboard(document.id);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };
  const busy = phase === 'uploading' || phase === 'signing';
  const sealState = phase === 'success' ? 'valid' : busy ? 'progress' : 'pending';

  return (
    <WorkspaceLayout eyebrow="OPÉRATION PROTÉGÉE · SIGN-01" title="Apposer un cachet" description="Le PDF est d’abord enregistré et haché par l’API, puis signé par le microservice pyHanko.">
      <div className="workbench">
        <section className="workbench__main">
          <ApiFeedback error={error} success={phase === 'success' ? 'Le document a été signé et inscrit au registre.' : ''} />
          {phase === 'success' ? <div className="completion-dossier"><span className="section-index">OPÉRATION TERMINÉE</span><h2>Acte scellé avec succès</h2><p>{file?.name}</p><dl><div><dt>ID DOCUMENT</dt><dd className="with-copy"><code>{document?.id}</code><button type="button" className="copy-id-button" onClick={copyDocumentId} title="Copier l’identifiant du document">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copié' : 'Copier'}</button></dd></div><div><dt>SHA-256 AVANT</dt><dd><code>{details?.before_sha256 || document?.beforeHash || 'Non exposé'}</code></dd></div><div><dt>SHA-256 SIGNÉ</dt><dd><code>{details?.after_sha256 || 'Non exposé'}</code></dd></div></dl><div className="completion-dossier__actions"><ButtonStamp primary icon={Download} onClick={downloadSigned}>Télécharger le PDF signé</ButtonStamp><Link className="stamp-button" to={`/documents/${document?.id}`}><FileCheck2 size={17} />Ouvrir la fiche</Link><ButtonStamp icon={RotateCcw} onClick={reset}>Signer un autre PDF</ButtonStamp></div></div> : <><FileDropzone file={file} onFile={selectFile} disabled={busy} title="Déposer le PDF à signer" description="L’API calcule l’empreinte SHA-256 dès le dépôt" />{document && <div className="hash-receipt"><span>RÉCÉPISSÉ D’EMPREINTE</span><strong>{document.originalName}</strong><code>{document.beforeHash || 'Empreinte non renvoyée'}</code><small>ID · {document.id}</small></div>}<div className="workbench-actions"><span>[ECDSA P-256 · CERTIFICAT POC]</span><ButtonStamp primary icon={FileCheck2} disabled={!document || busy} isLoading={phase === 'signing'} loadingLabel="Signature PAdES en cours" onClick={sign}>Apposer le cachet</ButtonStamp></div></>}
        </section>
        <aside className="workbench__seal"><span className="section-index">ÉTAT DU CACHET</span><SealStamp state={sealState} size="xl" impact={phase === 'success'} rotation={-8.5} /><strong>{phase === 'uploading' ? 'CALCUL DE L’EMPREINTE' : phase === 'signing' ? 'SIGNATURE EN COURS' : phase === 'success' ? 'ACTE VALIDÉ' : phase === 'ready' ? 'PRÊT À SIGNER' : 'EN ATTENTE DU PDF'}</strong><p>{phase === 'signing' ? 'Le service cryptographique construit le conteneur CMS et l’intègre au PDF.' : 'Aucune clé privée n’est manipulée dans le navigateur.'}</p></aside>
      </div>
    </WorkspaceLayout>
  );
};

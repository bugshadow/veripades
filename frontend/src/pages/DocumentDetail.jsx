import { ArrowLeft, Check, Copy, Download, FileSignature, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { SealStamp } from '../components/ui/SealStamp';
import api, { copyToClipboard, downloadFile, getApiErrorMessage } from '../lib/api';

const formatIso = (value) => value ? new Date(value).toISOString().replace('.000Z', 'Z') : '—';

export const DocumentDetail = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/documents/${id}`).then((response) => { if (active) setDocument(response.data); }).catch(async (requestError) => { if (active) setError(await getApiErrorMessage(requestError)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const downloadSigned = async () => {
    if (!document) return;
    const baseName = (document.originalName || 'document').replace(/\.pdf$/i, '');
    const result = await downloadFile(`/documents/${id}/download`, `${baseName}-signe.pdf`);
    if (!result.success) setError(result.message);
  };

  const copyDocumentId = async () => {
    if (!document?.id) return;
    const ok = await copyToClipboard(document.id);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  const actions = <Link className="stamp-button" to="/tableau-de-bord"><ArrowLeft size={17} />Retour au registre</Link>;
  if (loading) return <WorkspaceLayout eyebrow="FICHE DOCUMENT" title="Chargement du dossier" actions={actions}><div className="detail-skeleton"><span /><span /><span /></div></WorkspaceLayout>;
  if (error || !document) return <WorkspaceLayout eyebrow="FICHE DOCUMENT" title="Dossier indisponible" actions={actions}><ApiFeedback error={error || 'Document non trouve.'} /></WorkspaceLayout>;

  const sealState = document.status === 'SIGNED' ? 'valid' : document.status === 'ERROR' ? 'invalid' : 'pending';
  const events = [{ label: 'DEPOT ET CALCUL SHA-256', date: document.createdAt, detail: document.beforeHash }];
  if (document.updatedAt && document.updatedAt !== document.createdAt) events.push({ label: document.status === 'SIGNED' ? 'SIGNATURE PADES ENREGISTREE' : 'DERNIERE MISE A JOUR', date: document.updatedAt, detail: document.afterHash || document.status });

  return (
    <WorkspaceLayout eyebrow={`FICHE DOCUMENT \u00B7 ${document.id.slice(0, 8)}`} title={document.originalName} description="Metadonnees exposees par l'API pour le proprietaire authentifie." actions={actions}>
      <div className="document-record"><aside><SealStamp state={sealState} size="lg" impact={document.status === 'SIGNED'} /><span className={`status-mark status-mark--${document.status.toLowerCase()}`}>{document.status}</span>{document.status === 'SIGNED' ? <button className="stamp-button stamp-button--primary" onClick={downloadSigned}><Download size={17} />Telecharger le PDF signe</button> : <Link className="stamp-button stamp-button--primary" to="/signer"><FileSignature size={17} />Ouvrir l'atelier</Link>}</aside><section><dl className="record-grid"><div><dt>IDENTIFIANT</dt><dd className="with-copy"><code>{document.id}</code><button type="button" className="copy-id-button" onClick={copyDocumentId} title="Copier l’identifiant du document">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copié' : 'Copier'}</button></dd></div><div><dt>TYPE MIME</dt><dd>{document.mimeType}</dd></div><div><dt>TAILLE</dt><dd>{(document.size / 1024).toFixed(1)} Ko</dd></div><div><dt>CRE LE</dt><dd>{formatIso(document.createdAt)}</dd></div><div className="record-grid__wide"><dt>SHA-256 AVANT SIGNATURE</dt><dd><code>{document.beforeHash || 'Non disponible'}</code></dd></div><div className="record-grid__wide"><dt>SHA-256 APRES SIGNATURE</dt><dd><code>{document.afterHash || 'En attente de signature'}</code></dd></div></dl><div className="timeline"><div className="timeline__heading"><ShieldCheck size={18} /><h2>Historique d'horodatage</h2></div>{events.map((event, index) => <div className="timeline__event" key={`${event.label}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{event.label}</strong><time>{formatIso(event.date)}</time><code>{event.detail || '\u2014'}</code></div></div>)}</div></section></div>
    </WorkspaceLayout>
  );
};

import { FilePlus2, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { SealStamp } from '../components/ui/SealStamp';
import api, { getApiErrorMessage } from '../lib/api';

const formatDate = (value) => value ? new Date(value).toLocaleString('fr-MA', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const statusLabel = { PENDING: 'EN ATTENTE', SIGNED: 'SCELLÉ', ERROR: 'ÉCHEC' };

export const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/documents').then((response) => { if (active) setDocuments(response.data); }).catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((document) => document.originalName?.toLowerCase().includes(term) || document.id?.toLowerCase().includes(term) || document.status?.toLowerCase().includes(term));
  }, [documents, query]);

  const counts = documents.reduce((result, document) => ({ ...result, [document.status]: (result[document.status] || 0) + 1 }), {});
  const actions = <Link className="stamp-button stamp-button--primary" to="/signer"><FilePlus2 size={17} />Signer un document</Link>;

  return (
    <WorkspaceLayout eyebrow="REGISTRE PRIVÉ · DOC-LIST" title="Registre des actes" description="Documents appartenant à la session active, classés par date d’entrée." actions={actions}>
      <div className="registry-summary"><div><span>TOTAL</span><strong>{documents.length}</strong></div><div><span>SCELLÉS</span><strong>{counts.SIGNED || 0}</strong></div><div><span>EN ATTENTE</span><strong>{counts.PENDING || 0}</strong></div><div><span>INCIDENTS</span><strong>{counts.ERROR || 0}</strong></div></div>
      <div className="registry-toolbar"><label><Search size={16} /><span className="sr-only">Rechercher dans le registre</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par nom, ID ou statut" /></label><span>{filtered.length} LIGNE(S)</span></div>
      <ApiFeedback error={error} />
      <div className="registry-frame">
        {loading ? <div className="registry-skeleton" aria-label="Chargement du registre">{Array.from({ length: 5 }).map((_, index) => <span key={index} />)}</div> : filtered.length === 0 ? <div className="empty-ledger"><ShieldCheck size={28} /><strong>{documents.length === 0 ? 'Aucun acte dans ce registre' : 'Aucune ligne ne correspond à la recherche'}</strong><p>{documents.length === 0 ? 'Déposez votre premier PDF pour calculer son empreinte et le signer.' : 'Modifiez les termes de recherche.'}</p>{documents.length === 0 && <Link className="text-link" to="/signer">Signer un premier document</Link>}</div> : (
          <div className="registry-table-wrap"><table className="registry-table"><thead><tr><th>Cachet</th><th>Référence</th><th>Document</th><th>Date ISO</th><th>Empreinte</th><th>Statut</th></tr></thead><tbody>{filtered.map((document) => { const sealState = document.status === 'SIGNED' ? 'valid' : document.status === 'ERROR' ? 'invalid' : 'pending'; const hash = document.afterHash || document.beforeHash; return <tr key={document.id}><td><SealStamp state={sealState} size="xs" miniature /></td><td><Link to={`/documents/${document.id}`}>{document.id.slice(0, 8)}…</Link></td><td title={document.originalName}>{document.originalName}</td><td>{formatDate(document.createdAt)}</td><td><code>{hash ? `${hash.slice(0, 12)}…${hash.slice(-6)}` : '—'}</code></td><td><span className={`status-mark status-mark--${document.status.toLowerCase()}`}>{statusLabel[document.status] || document.status}</span></td></tr>; })}</tbody></table></div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

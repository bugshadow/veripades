import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { SealStamp } from '../components/ui/SealStamp';
import api, { getApiErrorMessage } from '../lib/api';

const knownIdsKey = 'cachet:knownDocumentIds';
const freshIdKey = 'cachet:freshDocumentId';

export const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const previousIds = useRef(new Set());
  const [freshIds, setFreshIds] = useState(new Set());

  useEffect(() => {
    const fetchDocs = async () => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const response = await api.get('/documents');
        const docs = response.data;
        const nextIds = new Set(docs.map((doc) => doc.id));
        const storedKnown = JSON.parse(window.localStorage.getItem(knownIdsKey) || '[]');
        const knownIds = previousIds.current.size > 0 ? previousIds.current : new Set(storedKnown);
        const pendingFreshId = window.localStorage.getItem(freshIdKey);
        const inserted = docs
          .filter((doc) => pendingFreshId === doc.id || (knownIds.size > 0 && !knownIds.has(doc.id)))
          .map((doc) => doc.id);

        previousIds.current = nextIds;
        window.localStorage.setItem(knownIdsKey, JSON.stringify([...nextIds]));
        if (pendingFreshId && nextIds.has(pendingFreshId)) window.localStorage.removeItem(freshIdKey);
        setFreshIds(new Set(inserted));
        setDocuments(docs);
        setSuccess(`${docs.length} document(s) charges depuis l'API.`);
        window.setTimeout(() => setFreshIds(new Set()), 900);
      } catch (err) {
        setError(new Error(getApiErrorMessage(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('fr-MA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderHash = (doc) => {
    const hash = doc.afterHash || doc.beforeHash || '';
    return hash ? `${hash.substring(0, 16)}...` : '-';
  };

  return (
    <MainLayout>
      <header style={{ marginBottom: '3rem' }}>
        <h1>Registre des Actes</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Historique des documents traites et etat de validation cryptographique.
        </p>
      </header>

      <div className="card-kraft registry-panel">
        <ApiFeedback isLoading={isLoading} error={error} success={success} />

        {!isLoading && !error && documents.length === 0 && (
          <div className="registry-empty">Aucun document n'a encore ete depose.</div>
        )}

        {!isLoading && !error && documents.length > 0 && (
          <table className="registry-table registry-table--living">
            <thead>
              <tr>
                <th></th>
                <th>ID Document</th>
                <th>Nom du fichier</th>
                <th>Date d'entree</th>
                <th>Empreinte SHA-256</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className={freshIds.has(doc.id) ? 'registry-row registry-row--fresh' : 'registry-row'}>
                  <td className="registry-row__seal">
                    <SealStamp state={doc.status === 'SIGNED' ? 'valid' : doc.status === 'ERROR' ? 'invalid' : 'pending'} miniature size="xs" rotation={-8} />
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{doc.id}</td>
                  <td>{doc.originalName}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{formatDate(doc.createdAt)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {renderHash(doc)}
                  </td>
                  <td>
                    <span className={`badge-status ${doc.status}`}>
                      {doc.status === 'SIGNED' ? 'SCELLE' : doc.status === 'PENDING' ? 'EN ATTENTE' : 'ECHEC'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
};
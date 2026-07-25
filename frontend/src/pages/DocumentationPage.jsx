import { ExternalLink, GitBranch, LockKeyhole, ShieldCheck } from 'lucide-react';
import { DGSSI_URL, GITHUB_PROFILE_URL, REPOSITORY_URL } from '../config';
import { PublicLayout } from '../components/layout/PublicLayout';

const endpoints = [
  ['POST', '/api/auth/register', 'PUBLIC', 'Créer un compte'], ['POST', '/api/auth/login', 'PUBLIC', 'Recevoir un JWT'],
  ['POST', '/api/documents', 'JWT', 'Déposer un PDF'], ['GET', '/api/documents', 'JWT', 'Lister ses documents'],
  ['GET', '/api/documents/:id', 'JWT', 'Consulter un document possédé'], ['POST', '/api/documents/:id/sign', 'JWT', 'Déclencher la signature'],
  ['POST', '/api/documents/verify', 'PUBLIC · LIMITÉ', 'Vérifier un PDF reçu'], ['POST', '/api/documents/:id/verify', 'PUBLIC · LIMITÉ', 'Vérifier par identifiant'],
];

export const DocumentationPage = () => (
  <PublicLayout className="documentation-page">
    <section className="doc-hero dossier-grid"><aside className="binder-margin"><span>DOSSIER</span><strong>DOC-01</strong><small>RÉVISION · 2026</small></aside><div><span className="section-index">DOCUMENTATION PRODUIT</span><h1>Architecture, contrats et limites du POC</h1><p>Référence courte pour comprendre les couches, les accès publics et les opérations protégées. Le détail d’implémentation reste dans le dépôt et les documents techniques.</p></div></section>
    <section className="dossier-section"><div className="section-heading"><span className="section-index">01 · ARCHITECTURE</span><h2>Quatre services, une responsabilité par couche</h2></div><div className="architecture-strip"><div><strong>React + Vite</strong><span>Interface et session mémoire</span></div><i>→</i><div><strong>Express API</strong><span>Auth, documents, orchestration</span></div><i>→</i><div><strong>FastAPI + pyHanko</strong><span>PAdES, ECDSA, PKI</span></div><i>↔</i><div><strong>PostgreSQL</strong><span>Métadonnées et traçabilité</span></div></div></section>
    <section className="dossier-section"><div className="section-heading"><span className="section-index">02 · CONTRAT HTTP</span><h2>Endpoints exposés par l’API</h2></div><div className="endpoint-ledger">{endpoints.map(([method, path, access, description]) => <div key={`${method}-${path}`}><code>{method}</code><strong>{path}</strong><span className={access.startsWith('PUBLIC') ? 'access-public' : 'access-private'}>{access.startsWith('PUBLIC') ? <ShieldCheck size={14} /> : <LockKeyhole size={14} />}{access}</span><p>{description}</p></div>)}</div></section>
    <section className="dossier-section"><div className="section-heading"><span className="section-index">03 · PORTÉE</span><h2>Ce que la démonstration prouve</h2></div><div className="scope-grid"><div><strong>INCLUS</strong><p>Mini-PKI locale, signature PDF PAdES, empreintes SHA-256, certificat X.509, détection d’altération, auth JWT et vérification publique filtrée.</p></div><div><strong>HORS PRODUCTION</strong><p>Qualification DGSSI, HSM, horodatage qualifié, OCSP/CRL de production, gestion de révocation complète et politique légale opérationnelle.</p></div></div></section>
    <section className="dossier-section repository-callout"><div><span className="section-index">SOURCE COMPLÈTE</span><h2>Lire le dépôt du projet</h2><p>{REPOSITORY_URL ? 'Le dépôt public configuré contient le README, la documentation et les tests.' : 'Le dépôt public n’est pas encore configuré. Définissez VITE_REPOSITORY_URL lorsque son URL sera disponible.'}</p></div><a className="stamp-button stamp-button--primary" href={REPOSITORY_URL || GITHUB_PROFILE_URL} target="_blank" rel="noreferrer"><GitBranch size={17} />{REPOSITORY_URL ? 'Ouvrir le dépôt' : 'Ouvrir le profil GitHub'}<ExternalLink size={15} /></a><a className="text-link" href={DGSSI_URL} target="_blank" rel="noreferrer">Références réglementaires DGSSI <ExternalLink size={15} /></a></section>
  </PublicLayout>
);


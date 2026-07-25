import { ArrowRight, BookOpen, ExternalLink, FileCheck2, GitBranch, LockKeyhole, SearchCheck, ShieldCheck, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DGSSI_URL, GITHUB_PROFILE_URL, REPOSITORY_URL } from '../config';
import { PublicLayout } from '../components/layout/PublicLayout';
import { SealStamp } from '../components/ui/SealStamp';
import { useInView } from '../hooks/useInView';

const pipeline = [
  { code: '01', title: 'Dépôt PDF', detail: 'POST /api/documents · contrôle MIME · limite 10 Mo', icon: Upload },
  { code: '02', title: 'Empreinte', detail: 'SHA-256 calcule une empreinte déterministe du fichier', icon: SearchCheck },
  { code: '03', title: 'Signature', detail: 'pyHanko produit une signature PAdES avec ECDSA P-256', icon: FileCheck2 },
  { code: '04', title: 'Chaîne PKI', detail: 'Autorité racine, intermédiaire et certificat signataire X.509', icon: LockKeyhole },
  { code: '05', title: 'Vérification', detail: 'Contrôle public de l’intégrité et détection d’altération', icon: ShieldCheck },
];

const stack = [
  ['INTERFACE', 'React 19 · Vite · React Router'],
  ['ORCHESTRATION', 'Node.js 20 · Express · JWT · Multer'],
  ['PERSISTANCE', 'PostgreSQL 15 · migrations'],
  ['CRYPTOGRAPHIE', 'Python 3.11 · FastAPI · pyHanko'],
  ['EXÉCUTION', 'Docker Compose · volumes partagés'],
];

export const LandingPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [pipelineRef, pipelineVisible] = useInView(0.25);
  const [stackRef, stackVisible] = useInView(0.25);
  const sealRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = null;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        if (sealRef.current) sealRef.current.style.transform = `translate3d(0, ${Math.min(window.scrollY * 0.07, 56)}px, 0)`;
        frame = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  return (
    <PublicLayout className="landing-page">
      <section className="landing-hero dossier-grid">
        <aside className="binder-margin">
          <span>DOSSIER</span><strong>CN-43/20</strong><small>STATUT · POC TECHNIQUE</small>
          <nav aria-label="Sommaire de la page"><a href="#contexte">01 Contexte</a><a href="#pipeline">02 Pipeline</a><a href="#roles">03 Rôles</a><a href="#stack">04 Stack</a></nav>
        </aside>
        <div className="hero-copy">
          <span className="section-index">SIGNATURE ÉLECTRONIQUE SÉCURISÉE</span>
          <h1>La preuve cryptographique, apposée comme un acte officiel.</h1>
          <p>PAdES · SHA-256 · ECDSA P-256 · PKI. Un POC complet pour signer un PDF, partager sa référence et permettre sa vérification indépendante.</p>
          <div className="hero-actions">
            <Link className="seal-cta seal-cta--primary" to="/verifier"><ShieldCheck size={22} /><span>Vérifier un document</span></Link>
            <Link className="seal-cta" to="/inscription"><FileCheck2 size={22} /><span>Créer un compte</span></Link>
          </div>
          <div className="hero-disclaimer"><span>NOTE DE PORTÉE</span> Démonstrateur pédagogique, sans qualification DGSSI ni valeur de service de confiance en production.</div>
        </div>
        <div className="hero-seal" ref={sealRef}><SealStamp size="xl" state="pending" /><span className="hero-seal__reference">RÉF. PAdES-B · 2026</span></div>
      </section>

      <section className="dossier-section legal-section" id="contexte">
        <div className="section-heading"><span className="section-index">01 · CONTEXTE MAROCAIN</span><h2>Du cadre légal à la preuve technique</h2></div>
        <div className="legal-layout">
          <div className="legal-copy"><p>La loi 43-20 structure les services de confiance numériques et succède au cadre historique de la loi 53-05. La DGSSI supervise les prestataires qualifiés et publie les références réglementaires.</p><p>Le marché combine acteurs historiques et plateformes récentes, notamment Barid eSign, Damanesign et des intégrateurs spécialisés. Le statut précis d’une offre doit toujours être vérifié dans le registre officiel avant toute conclusion juridique.</p><a className="text-link" href={DGSSI_URL} target="_blank" rel="noreferrer">Consulter les références DGSSI <ExternalLink size={15} /></a></div>
          <div className="signature-levels" aria-label="Trois niveaux de signature électronique">
            <div><span>01</span><strong>Simple</strong><p>Identification et preuve limitées selon le procédé employé.</p></div>
            <div><span>02</span><strong>Avancée</strong><p>Lien unique au signataire et détection des modifications.</p></div>
            <div><span>03</span><strong>Qualifiée</strong><p>Certificat et dispositif qualifiés, sous cadre réglementé.</p></div>
          </div>
        </div>
      </section>

      <section className="dossier-section pipeline-section" id="pipeline" ref={pipelineRef}>
        <div className="section-heading"><span className="section-index">02 · CHAÎNE DE TRAITEMENT</span><h2>Le pipeline cryptographique</h2></div>
        <div className={`pipeline-register ${pipelineVisible ? 'is-visible' : ''}`}>
          {pipeline.map((step, index) => { const Icon = step.icon; return <button type="button" key={step.code} style={{ '--i': index }} className={activeStep === index ? 'is-active' : ''} onClick={() => setActiveStep(index)}><span className="pipeline-node"><Icon size={19} /></span><small>{step.code}</small><strong>{step.title}</strong></button>; })}
        </div>
        <div className="terminal-readout"><span>$ cachet.inspect --étape {pipeline[activeStep].code}</span><code>{pipeline[activeStep].detail}</code></div>
      </section>

      <section className="dossier-section roles-section" id="roles">
        <div className="section-heading"><span className="section-index">03 · SÉPARATION DES RESPONSABILITÉS</span><h2>Deux rôles, deux surfaces d’exposition</h2></div>
        <div className="role-ledger">
          <article><div className="role-ledger__head"><LockKeyhole /><span>ZONE AUTHENTIFIÉE</span></div><h3>Le signataire</h3><p>Il ouvre une session JWT, dépose ses PDF, déclenche la signature et consulte son registre privé.</p><ul><li>JWT limité à 2 heures</li><li>Documents filtrés par propriétaire</li><li>Signature déléguée au microservice crypto</li></ul></article>
          <article><div className="role-ledger__head"><ShieldCheck /><span>ZONE PUBLIQUE</span></div><h3>Le vérificateur tiers</h3><p>Il contrôle un PDF reçu ou un identifiant partagé sans créer de compte et sans voir le propriétaire.</p><ul><li>Rapport public filtré</li><li>20 requêtes par minute et par IP</li><li>Verdict d’intégrité indépendant</li></ul></article>
        </div>
      </section>

      <section className="dossier-section stack-section" id="stack" ref={stackRef}>
        <div className="section-heading"><span className="section-index">04 · REGISTRE TECHNIQUE</span><h2>Une architecture séparée par responsabilité</h2></div>
        <div className={`stack-ledger ${stackVisible ? 'is-visible' : ''}`}>{stack.map(([layer, tools], index) => <div key={layer} style={{ '--i': index }}><span>{String(index + 1).padStart(2, '0')}</span><strong>{layer}</strong><code>{tools}</code></div>)}</div>
      </section>

      <section className="dossier-section quick-section">
        <div className="section-heading"><span className="section-index">05 · ACCÈS RAPIDE</span><h2>Ouvrir le bon dossier</h2></div>
        <div className="folder-row">
          <Link to="/documentation"><span>DOC-01</span><BookOpen /><strong>Documentation</strong><small>Architecture et endpoints</small><ArrowRight /></Link>
          <a href={REPOSITORY_URL || GITHUB_PROFILE_URL} target="_blank" rel="noreferrer"><span>SRC-02</span><GitBranch /><strong>Code source</strong><small>{REPOSITORY_URL ? 'Dépôt du projet' : 'Profil GitHub du projet'}</small><ArrowRight /></a>
          <Link to="/verifier"><span>VER-03</span><ShieldCheck /><strong>Vérifier</strong><small>Accès public sans compte</small><ArrowRight /></Link>
        </div>
      </section>
    </PublicLayout>
  );
};


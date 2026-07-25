import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { SealStamp } from '../components/ui/SealStamp';

export const NotFoundPage = () => <PublicLayout><section className="not-found"><SealStamp state="invalid" size="lg" /><span className="section-index">ERREUR DE CLASSEMENT · 404</span><h1>Dossier introuvable</h1><p>La référence demandée ne correspond à aucune route de l’interface.</p><Link className="stamp-button stamp-button--primary" to="/"><ArrowLeft size={17} />Retour à l’accueil</Link></section></PublicLayout>;

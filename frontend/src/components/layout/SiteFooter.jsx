import { GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GITHUB_PROFILE_URL } from '../../config';
import { ThemeToggle } from '../ui/ThemeToggle';

export const SiteFooter = () => (
  <footer className="site-footer">
    <div><span className="section-index">DOSSIER POC · 2026</span><strong>Le Cachet Numérique</strong><p>Omar Bouhaddach · Stage Onedustry Technologies</p></div>
    <div className="site-footer__links">
      <Link to="/documentation">Documentation</Link><Link to="/verifier">Vérification publique</Link>
      <a href={GITHUB_PROFILE_URL} target="_blank" rel="noreferrer"><GitBranch size={16} /> github.com/bugshadow</a>
    </div>
    <ThemeToggle />
  </footer>
);


import { FileCheck2, GitBranch, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { GITHUB_PROFILE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';

export const SiteHeader = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Link className="brand-lockup" to="/" aria-label="Le Cachet Numérique, accueil">
        <span className="brand-lockup__mark" aria-hidden="true"><FileCheck2 size={20} /></span>
        <span><strong>LE CACHET</strong><small>NUMÉRIQUE</small></span>
      </Link>
      <button type="button" className="icon-button mobile-menu-button" aria-label={open ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav className={`site-nav ${open ? 'site-nav--open' : ''}`} aria-label="Navigation principale">
        <NavLink to="/verifier" onClick={() => setOpen(false)}>Vérifier</NavLink>
        <NavLink to="/documentation" onClick={() => setOpen(false)}>Documentation</NavLink>
        <a href={GITHUB_PROFILE_URL} target="_blank" rel="noreferrer"><GitBranch size={16} aria-hidden="true" /> GitHub</a>
        <ThemeToggle compact />
        <Link className="header-session-link" to={user ? '/tableau-de-bord' : '/connexion'} onClick={() => setOpen(false)}><LogIn size={16} aria-hidden="true" />{user ? 'Registre' : 'Connexion'}</Link>
      </nav>
    </header>
  );
};


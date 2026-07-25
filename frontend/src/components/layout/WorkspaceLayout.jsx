import { FileCheck2, FileSignature, Files, Home, LogOut, ShieldCheck } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';

const links = [
  { to: '/tableau-de-bord', label: 'Registre', icon: Files },
  { to: '/signer', label: 'Signer', icon: FileSignature },
  { to: '/verifier', label: 'Vérifier', icon: ShieldCheck },
];

export const WorkspaceLayout = ({ children, eyebrow, title, description, actions }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-content">Aller au contenu</a>
      <aside className="workspace-sidebar">
        <Link className="brand-lockup" to="/"><span className="brand-lockup__mark" aria-hidden="true"><FileCheck2 size={20} /></span><span><strong>LE CACHET</strong><small>NUMÉRIQUE</small></span></Link>
        <div className="session-plate"><span>[SESSION AUTHENTIFIÉE]</span><strong>{user?.email}</strong><small>ID · {user?.id?.slice(0, 8)}</small></div>
        <nav className="workspace-nav" aria-label="Espace signataire">
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={18} aria-hidden="true" /><span>{label}</span></NavLink>)}
        </nav>
        <div className="workspace-sidebar__bottom">
          <ThemeToggle />
          <Link className="utility-link" to="/"><Home size={16} /> Accueil public</Link>
          <button className="utility-link" type="button" onClick={() => { logout(); navigate('/connexion', { replace: true }); }}><LogOut size={16} /> Fermer la session</button>
        </div>
      </aside>
      <main className="workspace-main" id="workspace-content">
        <header className="workspace-heading"><div><span className="section-index">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="workspace-heading__actions">{actions}</div>}</header>
        {children}
      </main>
    </div>
  );
};

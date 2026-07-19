import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut, FileSignature, ShieldCheck, List } from 'lucide-react';
import { SealStamp } from '../ui/SealStamp';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSessionAction = () => {
    if (user) {
      logout();
      navigate('/login');
      return;
    }

    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    color: isActive ? 'var(--color-text-main)' : 'var(--color-text-muted)',
    borderLeft: isActive ? '3px solid var(--color-accent-red)' : '3px solid transparent',
    backgroundColor: isActive ? 'rgba(237, 230, 214, 0.03)' : 'transparent',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    textDecoration: 'none'
  });

  return (
    <aside className="sidebar">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <SealStamp state="valid" miniature size="xs" rotation={-8} />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Sceau.ma</h2>
        </div>
        <hr className="separator" style={{ margin: '1rem 0 2rem 0' }} />
        
        <div style={{ marginBottom: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <div>{user ? '[SESSION_ACTIVE]' : '[SESSION_PUBLIQUE]'}</div>
          <div style={{ color: 'var(--color-text-main)', marginTop: '0.25rem' }}>{user?.email || 'Verification externe'}</div>
          <div>{user ? 'Niveau: AUTORISE' : 'Niveau: LECTURE'}</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {user && (
          <>
            <NavLink to="/" style={navLinkStyle} end>
              <List size={18} /> Registre des Actes
            </NavLink>
            <NavLink to="/sign" style={navLinkStyle}>
              <FileSignature size={18} /> Apposer Sceau
            </NavLink>
          </>
        )}
        <NavLink to="/verify" style={navLinkStyle}>
          <ShieldCheck size={18} /> Verification
        </NavLink>
      </nav>

      <div>
        <hr className="separator" style={{ margin: '1rem 0' }} />
        <button 
          onClick={handleSessionAction}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            padding: '0.5rem 0',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            fontSize: '0.8rem'
          }}
        >
          {user ? <LogOut size={16} /> : <LogIn size={16} />}
          {user ? 'Verrouiller session' : 'Ouvrir session'}
        </button>
      </div>
    </aside>
  );
};

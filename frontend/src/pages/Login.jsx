import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ButtonStamp } from '../components/ui/ButtonStamp';
import { ApiFeedback } from '../components/ui/ApiFeedback';

export const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <ApiFeedback isLoading={isLoading} />
      
      <div className="card-kraft" style={{ width: '100%', maxWidth: '800px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Colonne de gauche : Contexte officiel */}
        <div style={{ borderRight: '1px dashed var(--color-border)', paddingRight: '2rem' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Portail de Sécurité</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Accès réservé au registre de signature électronique et à la validation des actes.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <div className="seal-container seal-pending" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}></div>
          </div>
        </div>

        {/* Colonne de droite : Formulaire */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Authentification Requise</h2>
          
          <ApiFeedback error={error} />

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Identifiant (Email)</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="agent@dgssi.ma" 
                required 
              />
            </div>
            
            <div className="input-group">
              <label>Clé d'accès</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
              />
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'right' }}>
              <ButtonStamp type="submit" primary={true} isLoading={isLoading}>
                DÉVERROUILLER
              </ButtonStamp>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

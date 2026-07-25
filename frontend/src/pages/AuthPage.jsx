import { ArrowLeft, FileCheck2, KeyRound, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ApiFeedback } from '../components/ui/ApiFeedback';
import { ButtonStamp } from '../components/ui/ButtonStamp';
import { SealStamp } from '../components/ui/SealStamp';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/api';

export const AuthPage = ({ mode }) => {
  const registering = mode === 'register';
  const { user, login, register, sessionNotice, clearSessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => clearSessionNotice(), [clearSessionNotice]);
  if (user) return <Navigate to="/tableau-de-bord" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (registering && password !== confirm) { setError('Les deux mots de passe doivent être identiques.'); return; }
    setLoading(true);
    try {
      if (registering) await register(email, password); else await login(email, password);
      navigate(location.state?.from || '/tableau-de-bord', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, registering ? 'Inscription impossible avec ces informations.' : 'Email ou mot de passe incorrect'));
    } finally { setLoading(false); }
  };

  return (
    <PublicLayout className="auth-page">
      <section className="auth-sheet">
        <div className="auth-sheet__identity"><Link to="/" className="text-link"><ArrowLeft size={15} /> Retour au dossier public</Link><span className="section-index">FICHE D’ENREGISTREMENT · AUTH-02</span><h1>{registering ? 'Ouvrir un registre signataire' : 'Accéder au registre privé'}</h1><p>{registering ? 'Créez les identifiants utilisés par l’API réelle, puis ouvrez automatiquement la session JWT.' : 'Authentification requise pour déposer, signer et consulter vos documents.'}</p><SealStamp state="pending" size="lg" /></div>
        <form className="register-form" onSubmit={submit} noValidate>
          <div className="register-form__header"><FileCheck2 size={21} /><span>{registering ? 'INSCRIPTION' : 'CONNEXION'} · API /AUTH</span></div>
          <ApiFeedback info={sessionNotice} error={error} />
          <label>EMAIL<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@organisation.ma" required /></label>
          <label>MOT DE PASSE<input type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" required /></label>
          {registering && <label>CONFIRMER LE MOT DE PASSE<input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Répétez le mot de passe" required /></label>}
          <div className="register-form__actions"><ButtonStamp primary icon={registering ? UserPlus : KeyRound} isLoading={loading} loadingLabel={registering ? 'Création du compte' : 'Ouverture de session'}>{registering ? 'Créer le compte' : 'Ouvrir la session'}</ButtonStamp></div>
          <p className="form-switch">{registering ? 'Un registre existe déjà ?' : 'Aucun registre à votre nom ?'} <Link to={registering ? '/connexion' : '/inscription'}>{registering ? 'Se connecter' : 'Créer un compte'}</Link></p>
        </form>
      </section>
    </PublicLayout>
  );
};

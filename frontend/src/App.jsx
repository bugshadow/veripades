import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { VerifyDocument } from './pages/VerifyDocument';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { SignDocument } from './pages/SignDocument';
import { DocumentDetail } from './pages/DocumentDetail';
import { DocumentationPage } from './pages/DocumentationPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/verifier" element={<VerifyDocument />} />
            <Route path="/connexion" element={<AuthPage mode="login" />} />
            <Route path="/inscription" element={<AuthPage mode="register" />} />
            <Route path="/tableau-de-bord" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/signer" element={<ProtectedRoute><SignDocument /></ProtectedRoute>} />
            <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/login" element={<Navigate to="/connexion" replace />} />
            <Route path="/verify" element={<Navigate to="/verifier" replace />} />
            <Route path="/sign" element={<Navigate to="/signer" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

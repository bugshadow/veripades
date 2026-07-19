import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';

import { Dashboard } from './pages/Dashboard';
import { SignDocument } from './pages/SignDocument';
import { VerifyDocument } from './pages/VerifyDocument';

// Composant pour protÃ©ger les routes
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Routes protÃ©gÃ©es */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/sign" element={<ProtectedRoute><SignDocument /></ProtectedRoute>} />
      <Route path="/verify" element={<VerifyDocument />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;


import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/discord';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '24px',
    }}>
      <h1>LoL Dashboard</h1>
      <p>Accedi con il tuo account Discord per vedere le statistiche del tuo gruppo.</p>
      <button onClick={handleLogin} style={{
        backgroundColor: '#5865F2',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '16px',
        cursor: 'pointer',
      }}>
        Accedi con Discord
      </button>
    </div>
  );
};

export default Login;
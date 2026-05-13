import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <button onClick={logout} style={{
          background: 'none',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '8px 16px',
          cursor: 'pointer',
        }}>
          Logout
        </button>
      </div>
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user.avatar && (
          <img
            src={user.avatar}
            alt={user.username}
            style={{ width: '64px', height: '64px', borderRadius: '50%' }}
          />
        )}
        <div>
          <h2>{user.username}</h2>
          <p style={{ color: '#888' }}>Bentornato! La dashboard è in costruzione.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
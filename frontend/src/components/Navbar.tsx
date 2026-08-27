import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Don't show navbar on login page
  if (location.pathname === '/login') {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>PEELP</h1>
        </div>

        <div className="navbar-menu">
          <a href="/" className="nav-link">Home</a>
          {user?.role === 'ADMIN' && (
            <Link to="/admin/users" className="nav-link">Admin</Link>
          )}
        </div>

        {user && (
          <div className="navbar-user">
            <div className="user-info-section">
              {user.image && (
                <img src={user.image} alt={user.name} className="user-avatar" />
              )}
              <span className="user-name">{user.name}</span>
            </div>

            <button onClick={handleLogout} className="logout-btn">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

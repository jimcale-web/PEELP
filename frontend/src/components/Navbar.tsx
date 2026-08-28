import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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

        {/* Desktop menu */}
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

        {/* Hamburger button (mobile only) */}
        <button
          className={`navbar-hamburger${menuOpen ? ' is-open' : ''}`}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="navbar-mobile-drawer" onClick={() => setMenuOpen(false)}>
          <a href="/" className="nav-link-mobile">Home</a>
          {user?.role === 'ADMIN' && (
            <Link to="/admin/users" className="nav-link-mobile">Admin</Link>
          )}
          {user && (
            <>
              <div className="mobile-user-info">
                {user.image && (
                  <img src={user.image} alt={user.name} className="user-avatar" />
                )}
                <span className="mobile-user-name">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="mobile-logout-btn">
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

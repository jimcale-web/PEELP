import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (location.pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const goToCoursePlayer = () => {
    const lastCourseId = localStorage.getItem('student:lastCourseId');
    navigate(lastCourseId ? `/student/course/${lastCourseId}` : '/student/courses');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>PEELP</h1>
        </div>

        {/* Desktop menu */}
        <div className="navbar-menu">
          <Link to="/" className="nav-link">Home</Link>
          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link to="/admin/users" className="nav-link">Admin</Link>
          )}
          {isAuthenticated && (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
            <Link to="/instructor" className="nav-link">Instructor</Link>
          )}
          {(!isAuthenticated || user?.role === 'STUDENT') && (
            <Link to="/student/courses" className="nav-link">Courses</Link>
          )}
          {
            <Link to="/about" className="nav-link">About</Link>
          }
          {isAuthenticated && user?.role === 'STUDENT' && (
            <button type="button" onClick={goToCoursePlayer} className="nav-link nav-link-button">
              Course Player
            </button>
          )}
        </div>

        {user ? (
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
        ) : (
          <div className="navbar-user">
            <Link to="/login" className="nav-link">Sign In</Link>
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
          <Link to="/" className="nav-link-mobile">Home</Link>
          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link to="/admin/users" className="nav-link-mobile">Admin</Link>
          )}
          {isAuthenticated && (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
            <Link to="/instructor" className="nav-link-mobile">Instructor</Link>
          )}
          {(!isAuthenticated || user?.role === 'STUDENT') && (
            <Link to="/student/courses" className="nav-link-mobile">Courses</Link>
          )}
          <Link to="/about" className="nav-link-mobile">About</Link>
          {isAuthenticated && user?.role === 'STUDENT' && (
            <button type="button" onClick={goToCoursePlayer} className="nav-link-mobile nav-link-mobile-button">
              Course Player
            </button>
          )}
          {user ? (
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
          ) : (
            <Link to="/login" className="nav-link-mobile">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
}

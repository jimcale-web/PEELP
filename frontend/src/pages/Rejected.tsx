import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/ApprovalWall.css';

export default function Rejected() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="approval-wall">
      <div className="approval-card">
        <div className="approval-icon approval-icon--rejected">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1>Access Denied</h1>
        <p>
          Your account registration has been reviewed and was not approved.
          If you believe this is a mistake, please contact your administrator.
        </p>
        <button className="approval-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/ApprovalWall.css';

export default function PendingApproval() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="approval-wall">
      <div className="approval-card">
        <div className="approval-icon approval-icon--pending">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1>Awaiting Approval</h1>
        <p>
          Your account has been created and is pending review by an administrator.
          You'll be able to access the platform once your account is approved.
        </p>
        <p className="approval-hint">Please check back later or contact your administrator.</p>
        <button className="approval-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

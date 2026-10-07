import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/ApprovalWall.css';

const POLL_INTERVAL_MS = 10000;
const WHATSAPP_NUMBER = '251714828925';

function homePathFor(role?: string) {
  if (role === 'ADMIN') return '/admin/users';
  if (role === 'INSTRUCTOR') return '/instructor';
  return '/student/courses';
}

export default function PendingApproval() {
  const { logout, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const isWaiting = !!user && user.approvalStatus !== 'APPROVED';

  useEffect(() => {
    if (!isWaiting) return;
    const check = async () => {
      try {
        await api.get('/me');
        window.location.assign(homePathFor(user?.role));
      } catch (err) {
        const code = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
        if (code === 'REJECTED') navigate('/rejected', { replace: true });
      }
    };
    const timer = window.setInterval(check, POLL_INTERVAL_MS);
    check();
    return () => window.clearInterval(timer);
  }, [isWaiting, user?.role, navigate]);

  if (!isLoading && !user) return <Navigate to="/login" replace />;
  if (!isLoading && user && user.approvalStatus === 'APPROVED') {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

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
          Accountka si guul leh ayaa lo sameeyay  waxa u dhiman ansixinta maamulka.
          Waxaad awoodi doontaa inaad gasho marka akoonkaaga la ansixiyo.
        </p>
        <p className="approval-hint">Fadlan dib u eeg mar dambe ama la xiriir maamulkaaga.</p>
        <div>
          <a
            className="approval-whatsapp-link"
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact us on WhatsApp"
          >
            <FaWhatsapp aria-hidden="true" />
            <span>Contact us on WhatsApp</span>
          </a>
        </div>
        <button className="approval-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

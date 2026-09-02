import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Home.css';

export default function Home() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/users" replace />;
  }

  if (user?.role === 'INSTRUCTOR') {
    return <Navigate to="/instructor" replace />;
  }

  if (user?.role === 'STUDENT') {
    return <Navigate to="/student/courses" replace />;
  }

  return (
    <div className="home-container">
      <div className="welcome-card">
        <h1>Welcome to PEELP</h1>
        <p>Online Learning Management System</p>

        {user && (
          <div className="user-info">
            <p>Hello, <strong>{user.name}</strong>!</p>
            <p>Role: <span className="role-badge">{user.role}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

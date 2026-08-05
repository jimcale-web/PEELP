import { useAuth } from '../contexts/AuthContext';
import '../styles/Home.css';

export default function Home() {
  const { user } = useAuth();

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

        <div className="features">
          <h2>Features</h2>
          <ul>
            <li>📚 Access courses and learning materials</li>
            <li>📊 Track your progress</li>
            <li>✅ Complete quizzes and assignments</li>
            <li>📜 Earn certificates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

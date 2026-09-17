import '../styles/Home.css';
import Hero from '../components/Common/hero/hero';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <section aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">Welcome to PEELP</h2>
        {user && (
          <div className="user-info">
            <strong>{user.name}</strong>
            <span className="role-badge">{user.role}</span>
          </div>
        )}
      </section>
      <Hero />
    </div>
  );
}

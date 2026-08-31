import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface InstructorRouteProps {
  children: React.ReactNode;
}

export default function InstructorRoute({ children }: InstructorRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'INSTRUCTOR' && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}

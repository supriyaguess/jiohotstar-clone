import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageLoader } from '../components/ui/LoadingSpinner';

// Landing page after the Google redirect: the refresh cookie is set, so just start the session.
export default function AuthCallback() {
  const { restoreSession } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    restoreSession()
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=session', { replace: true }));
  }, [restoreSession, navigate]);

  return <PageLoader />;
}

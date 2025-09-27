import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, createPoll } from '../services/polls';
import { ADMIN_KEY_PREFIX } from '../constants/storage';

const HomeRoute = () => {
  const navigate = useNavigate();
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  const handleCreatePoll = useCallback(async () => {
    if (typeof window === 'undefined' || isCreatingPoll) {
      return;
    }

    setIsCreatingPoll(true);
    setHomeError(null);

    const pollId = crypto.randomUUID();

    try {
      await createPoll({ id: pollId });
      localStorage.setItem(`${ADMIN_KEY_PREFIX}${pollId}`, 'true');
      navigate(`/polls/${pollId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setHomeError(error.message);
      } else if (error instanceof Error) {
        setHomeError(error.message || 'Failed to create poll');
      } else {
        setHomeError('Failed to create poll');
      }
    } finally {
      setIsCreatingPoll(false);
    }
  }, [isCreatingPoll, navigate]);

  return (
    <div className="home">
      <div className="home__panel">
        <h1 className="home__title">Jungle Champ Select</h1>
        <p className="home__subtitle">Spin up a poll and share the link with your team.</p>
        <button type="button" className="home__cta" onClick={handleCreatePoll} disabled={isCreatingPoll}>
          {isCreatingPoll ? 'Creating...' : 'Create New Poll'}
        </button>
        {homeError && <span className="home__error">{homeError}</span>}
      </div>
    </div>
  );
};

export default HomeRoute;

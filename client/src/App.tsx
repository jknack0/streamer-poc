import { useCallback, useEffect, useState } from 'react';
import ChampionSelect from './components/ChampionSelect';
import type { Champion } from './data/junglers';
import { ApiError, clearVotes, createPoll, fetchPoll, recordVote, updatePollStatus } from './services/polls';
import type { Poll } from './services/polls';
import './App.css';
import type { PollStatus } from './types/poll';

const ADMIN_KEY_PREFIX = 'poll-admin:';
const VOTER_KEY_PREFIX = 'poll-voter:';

type Route =
  | { name: 'home' }
  | { name: 'poll'; pollId: string };

const parsePath = (pathname: string): Route => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'polls' && segments[1]) {
    return { name: 'poll', pollId: segments[1] };
  }

  return { name: 'home' };
};

const getIsAdmin = (pollId: string) => {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(`${ADMIN_KEY_PREFIX}${pollId}`) === 'true';
};

const getOrCreateVoterId = (pollId: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storageKey = `${VOTER_KEY_PREFIX}${pollId}`;
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const voterId = crypto.randomUUID();
  localStorage.setItem(storageKey, voterId);
  return voterId;
};

const App = () => {
  const [route, setRoute] = useState<Route>(() => {
    if (typeof window === 'undefined') {
      return { name: 'home' };
    }

    return parsePath(window.location.pathname);
  });
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollVersion, setPollVersion] = useState(0);
  const [isLoadingPoll, setIsLoadingPoll] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLockingIn, setIsLockingIn] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parsePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (route.name === 'poll') {
      setPollVersion(0);
    }
  }, [route]);

  useEffect(() => {
    if (route.name !== 'poll') {
      setPoll(null);
      setPollError(null);
      setStatusMessage(null);
      setStatusError(null);
      return;
    }

    let isMounted = true;
    const loadPoll = async () => {
      setIsLoadingPoll(true);
      setPollError(null);
      try {
        const data = await fetchPoll(route.pollId);
        if (!isMounted) {
          return;
        }

        setPoll(data);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setPollError('Poll not found');
        } else if (error instanceof Error) {
          setPollError(error.message || 'Failed to load poll');
        } else {
          setPollError('Failed to load poll');
        }

        setPoll(null);
      } finally {
        if (isMounted) {
          setIsLoadingPoll(false);
        }
      }
    };

    loadPoll();

    return () => {
      isMounted = false;
    };
  }, [route]);

  useEffect(() => {
    if (statusMessage === null && statusError === null) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage(null);
      setStatusError(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [statusMessage, statusError]);

  const navigate = useCallback((next: Route, replace = false) => {
    if (typeof window === 'undefined') {
      return;
    }

    const targetPath = next.name === 'home' ? '/' : `/polls/${next.pollId}`;

    if (replace) {
      window.history.replaceState(null, '', targetPath);
    } else {
      window.history.pushState(null, '', targetPath);
    }

    setRoute(next);
  }, []);

  useEffect(() => {
    if (route.name === 'home' && typeof window !== 'undefined' && window.location.pathname !== '/') {
      navigate({ name: 'home' }, true);
    }
  }, [navigate, route]);

  const handleCreatePoll = useCallback(async () => {
    if (typeof window === 'undefined' || isCreatingPoll) {
      return;
    }

    setIsCreatingPoll(true);
    setHomeError(null);

    const pollId = crypto.randomUUID();

    try {
      const createdPoll = await createPoll({ id: pollId });
      localStorage.setItem(`${ADMIN_KEY_PREFIX}${pollId}`, 'true');
      setPoll(createdPoll);
      navigate({ name: 'poll', pollId });
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

  const handleStartPoll = useCallback(async () => {
    if (route.name !== 'poll' || !poll) {
      return;
    }

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    setStatusError(null);

    try {
      const updated = await updatePollStatus(poll.id, 'active');
      setPoll(updated);
      setStatusMessage('Poll is live');
    } catch (error) {
      if (error instanceof ApiError) {
        setStatusError(error.message);
      } else if (error instanceof Error) {
        setStatusError(error.message || 'Failed to start poll');
      } else {
        setStatusError('Failed to start poll');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [poll, route]);

  const handleStopPoll = useCallback(async () => {
    if (route.name !== 'poll' || !poll) {
      return;
    }

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    setStatusError(null);

    try {
      const updated = await updatePollStatus(poll.id, 'stopped');
      setPoll(updated);
      setStatusMessage('Poll closed');
    } catch (error) {
      if (error instanceof ApiError) {
        setStatusError(error.message);
      } else if (error instanceof Error) {
        setStatusError(error.message || 'Failed to stop poll');
      } else {
        setStatusError('Failed to stop poll');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [poll, route]);

  const handleRestartPoll = useCallback(async () => {
    if (route.name !== 'poll' || !poll) {
      return;
    }

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    setStatusError(null);

    try {
      await clearVotes(poll.id);
      const updated = await updatePollStatus(poll.id, 'active');
      setPoll(updated);
      setPollVersion((current) => current + 1);
      setStatusMessage('Poll restarted');
    } catch (error) {
      if (error instanceof ApiError) {
        setStatusError(error.message);
      } else if (error instanceof Error) {
        setStatusError(error.message || 'Failed to restart poll');
      } else {
        setStatusError('Failed to restart poll');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [poll, route]);

  const handleLockIn = useCallback(
    async (champion: Champion) => {
      if (route.name !== 'poll' || !poll) {
        throw new Error('Poll not ready');
      }

      setIsLockingIn(true);
      try {
        const voterId = getOrCreateVoterId(poll.id);
        const response = await recordVote(poll.id, champion.slug, voterId);
        setPoll(response.poll);
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(error.message);
        }

        if (error instanceof Error) {
          throw error;
        }

        throw new Error('Failed to lock in champion');
      } finally {
        setIsLockingIn(false);
      }
    },
    [poll, route],
  );

  if (route.name === 'home') {
    return (
      <div className="home">
        <div className="home__panel">
          <h1 className="home__title">Jungle Champ Select</h1>
          <p className="home__subtitle">Spin up a poll and share the link with your team.</p>
          <button
            type="button"
            className="home__cta"
            onClick={handleCreatePoll}
            disabled={isCreatingPoll}
          >
            {isCreatingPoll ? 'Creating...' : 'Create New Poll'}
          </button>
          {homeError && <span className="home__error">{homeError}</span>}
        </div>
      </div>
    );
  }

  if (pollError) {
    return (
      <div className="poll-message">
        <div className="poll-message__panel">
          <h1 className="poll-message__title">{pollError}</h1>
          <button type="button" className="poll-message__cta" onClick={() => navigate({ name: 'home' })}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="poll-message">
        <div className="poll-message__panel">
          <h1 className="poll-message__title">Loading poll...</h1>
        </div>
      </div>
    );
  }

  const pollStatus: PollStatus = poll.status;
  const pollId = route.pollId;
  const pollUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isAdmin = getIsAdmin(pollId);

  return (
    <ChampionSelect
      key={`${pollId}-${pollVersion}`}
      pollId={pollId}
      pollUrl={pollUrl}
      pollStatus={pollStatus}
      isAdmin={isAdmin}
      isLoading={isLoadingPoll}
      isUpdatingPoll={isUpdatingStatus}
      isLockingIn={isLockingIn}
      statusMessage={statusMessage}
      statusError={statusError}
      onStartPoll={handleStartPoll}
      onStopPoll={handleStopPoll}
      onRestartPoll={handleRestartPoll}
      onLockIn={handleLockIn}
    />
  );
};

export default App;

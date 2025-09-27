import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import ChampionSelect from './components/ChampionSelect';
import type { Champion } from './data/junglers';
import { ApiError, clearVotes, createPoll, fetchPoll, fetchVotes, recordVote, updatePollStatus } from './services/polls';
import type { Poll } from './services/polls';
import { createSocket, type PollErrorEvent, type PollUpdateEvent, type PollVotesEvent } from './services/socket';
import './App.css';
import type { PollStatus, TopVote } from './types/poll';

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
  const [topVotes, setTopVotes] = useState<TopVote[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [lockedChampionSlug, setLockedChampionSlug] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

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
      setTopVotes([]);
      setTotalVotes(0);
      setSocketError(null);
      setLockedChampionSlug(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const voterId = getOrCreateVoterId(route.pollId) ?? undefined;
    let isMounted = true;
    const loadPoll = async () => {
      setIsLoadingPoll(true);
      setPollError(null);
      setTopVotes([]);
      setTotalVotes(0);
      setLockedChampionSlug(null);

      try {
        const data = await fetchPoll(route.pollId);
        if (!isMounted) {
          return;
        }

        setPoll(data);

        try {
          const voteData = await fetchVotes(route.pollId);
          if (!isMounted) {
            return;
          }

          setTopVotes(voteData.topVotes);
          setTotalVotes(voteData.totalVotes);

          if (voterId) {
            const existingVote = voteData.votes.find((vote) => vote.voterId === voterId);
            setLockedChampionSlug(existingVote?.championSlug ?? null);
          }
        } catch (voteError) {
          if (isMounted) {
            const message =
              voteError instanceof ApiError
                ? voteError.message
                : voteError instanceof Error
                  ? voteError.message
                  : 'Failed to load votes';
            setSocketError((prev) => prev ?? message);
          }
        }
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

  useEffect(() => {
    if (route.name !== 'poll') {
      return;
    }

    const socket = createSocket();
    socketRef.current = socket;
    setSocketError(null);

    const handlePollUpdate = (payload: PollUpdateEvent) => {
      if (!payload?.poll || payload.poll.id !== route.pollId) {
        return;
      }

      setPoll((current) => {
        if (!current || current.id === payload.poll.id) {
          return payload.poll;
        }

        return current;
      });
    };

    const handlePollVotes = (payload: PollVotesEvent) => {
      if (!payload || payload.pollId !== route.pollId) {
        return;
      }

      setTopVotes(payload.topVotes ?? []);
      setTotalVotes(typeof payload.totalVotes === 'number' ? payload.totalVotes : 0);
    };

    const handlePollError = (payload: PollErrorEvent | string) => {
      if (typeof payload === 'string') {
        setSocketError(payload);
        return;
      }

      if (!payload) {
        return;
      }

      if ('error' in payload && typeof payload.error === 'string') {
        setSocketError(payload.error);
      }
    };

    socket.on('connect', () => {
      setSocketError(null);
      socket.emit('poll:join', route.pollId);
    });

    socket.on('poll:update', handlePollUpdate);
    socket.on('poll:votes', handlePollVotes);
    socket.on('poll:error', handlePollError);
    socket.on('connect_error', (error) => {
      handlePollError(error instanceof Error ? error.message : 'Connection error');
    });
    socket.on('error', (error) => {
      handlePollError(error instanceof Error ? error.message : 'Socket error');
    });

    socket.connect();

    return () => {
      socket.removeListener('poll:update', handlePollUpdate);
      socket.removeListener('poll:votes', handlePollVotes);
      socket.removeListener('poll:error', handlePollError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [route]);

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
      setTopVotes([]);
      setTotalVotes(0);
      setLockedChampionSlug(null);
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
      setTopVotes([]);
      setTotalVotes(0);
      setLockedChampionSlug(null);
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

      if (lockedChampionSlug) {
        throw new Error('You have already voted.');
      }

      setIsLockingIn(true);
      try {
        const voterId = getOrCreateVoterId(poll.id);
        if (!voterId) {
          throw new Error('Missing voter id');
        }
        const response = await recordVote(poll.id, champion.slug, voterId);
        setPoll(response.poll);
        setTopVotes(response.topVotes);
        setTotalVotes(response.totalVotes);
        setLockedChampionSlug(champion.slug);
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
    [lockedChampionSlug, poll, route],
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
      topVotes={topVotes}
      totalVotes={totalVotes}
      socketError={socketError}
      lockedChampionSlug={lockedChampionSlug}
      onStartPoll={handleStartPoll}
      onStopPoll={handleStopPoll}
      onRestartPoll={handleRestartPoll}
      onLockIn={handleLockIn}
    />
  );
};

export default App;

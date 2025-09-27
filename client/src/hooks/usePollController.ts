import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Champion } from '../data/junglers';
import type { Poll } from '../services/polls';
import {
  ApiError,
  clearVotes,
  fetchPoll,
  fetchVotes,
  recordVote,
  updatePollStatus,
} from '../services/polls';
import { createSocket, type PollErrorEvent, type PollUpdateEvent, type PollVotesEvent } from '../services/socket';
import type { TopVote } from '../types/poll';
import { getOrCreateVoterId } from '../utils/pollIdentity';

interface UsePollControllerResult {
  poll: Poll | null;
  pollVersion: number;
  isLoadingPoll: boolean;
  pollError: string | null;
  isUpdatingStatus: boolean;
  statusMessage: string | null;
  statusError: string | null;
  isLockingIn: boolean;
  topVotes: TopVote[];
  totalVotes: number;
  socketError: string | null;
  lockedChampionSlug: string | null;
  startPoll: () => Promise<void>;
  stopPoll: () => Promise<void>;
  restartPoll: () => Promise<void>;
  lockIn: (champion: Champion) => Promise<void>;
}

const usePollController = (pollId?: string | null): UsePollControllerResult => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollVersion, setPollVersion] = useState(0);
  const [isLoadingPoll, setIsLoadingPoll] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
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
    setPoll(null);
    setPollVersion(0);
    setPollError(null);
    setStatusMessage(null);
    setStatusError(null);
    setTopVotes([]);
    setTotalVotes(0);
    setSocketError(null);
    setLockedChampionSlug(null);
    setIsLoadingPoll(false);
    setIsUpdatingStatus(false);
    setIsLockingIn(false);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [pollId]);

  useEffect(() => {
    if (!pollId) {
      return;
    }

    const voterId = getOrCreateVoterId(pollId) ?? undefined;
    let isMounted = true;

    const loadPoll = async () => {
      setIsLoadingPoll(true);
      setPollError(null);
      setTopVotes([]);
      setTotalVotes(0);
      setLockedChampionSlug(null);

      try {
        const data = await fetchPoll(pollId);
        if (!isMounted) {
          return;
        }

        setPoll(data);

        try {
          const voteData = await fetchVotes(pollId);
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
  }, [pollId]);

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
    if (!pollId) {
      return;
    }

    const socket = createSocket();
    socketRef.current = socket;
    setSocketError(null);

    const handlePollUpdate = (payload: PollUpdateEvent) => {
      if (!payload?.poll || payload.poll.id !== pollId) {
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
      if (!payload || payload.pollId !== pollId) {
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
      socket.emit('poll:join', pollId);
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
  }, [pollId]);

  const startPoll = useCallback(async () => {
    if (!pollId || !poll) {
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
  }, [poll, pollId]);

  const stopPoll = useCallback(async () => {
    if (!pollId || !poll) {
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
  }, [poll, pollId]);

  const restartPoll = useCallback(async () => {
    if (!pollId || !poll) {
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
  }, [poll, pollId]);

  const lockIn = useCallback(
    async (champion: Champion) => {
      if (!pollId || !poll) {
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
    [lockedChampionSlug, poll, pollId],
  );

  return {
    poll,
    pollVersion,
    isLoadingPoll,
    pollError,
    isUpdatingStatus,
    statusMessage,
    statusError,
    isLockingIn,
    topVotes,
    totalVotes,
    socketError,
    lockedChampionSlug,
    startPoll,
    stopPoll,
    restartPoll,
    lockIn,
  };
};

export default usePollController;

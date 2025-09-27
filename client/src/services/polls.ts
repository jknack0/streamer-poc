import type { PollStatus, TopVote } from '../types/poll';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_PREFIX = '/api';

interface Poll {
  id: string;
  status: PollStatus;
  createdAt: string;
  updatedAt: string;
}

interface Vote {
  pollId: string;
  voterId: string | null;
  championSlug: string;
  createdAt: string;
}

interface CreatePollPayload {
  id?: string;
  status?: PollStatus;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const normalizeVote = (vote: Record<string, unknown>): Vote => ({
  pollId: String(vote.poll_id ?? vote.pollId ?? ''),
  voterId:
    vote.voter_id === null || vote.voter_id === undefined
      ? null
      : String(vote.voter_id ?? vote.voterId ?? ''),
  championSlug: String(vote.champion_slug ?? vote.championSlug ?? ''),
  createdAt: String(vote.created_at ?? vote.createdAt ?? ''),
});

const normalizeTopVotes = (entries: unknown[] = []): TopVote[] =>
  entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      if ('championSlug' in entry && typeof entry.championSlug === 'string') {
        const maybeCount =
          'count' in entry && typeof entry.count === 'number'
            ? entry.count
            : (entry as Record<string, unknown>).count;

        return {
          championSlug: entry.championSlug,
          count: Number(maybeCount ?? 0),
        };
      }

      const record = entry as Record<string, unknown>;
      const slugValue = record.championSlug ?? record['champion_slug'];
      if (typeof slugValue !== 'string') {
        return null;
      }

      const countValue =
        record.count ?? record['voteCount'] ?? record['total'] ?? record['votes'] ?? 0;

      return {
        championSlug: slugValue,
        count: Number(countValue ?? 0),
      };
    })
    .filter((value): value is TopVote => value !== null);

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url = `${API_BASE_URL}${API_PREFIX}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : null) ?? `Request failed with status ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload as T;
};

const createPoll = async (payload: CreatePollPayload = {}): Promise<Poll> => {
  return request<Poll>('/polls', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

const fetchPoll = async (pollId: string): Promise<Poll> => {
  return request<Poll>(`/polls/${pollId}`);
};

const updatePollStatus = async (pollId: string, status: PollStatus): Promise<Poll> => {
  return request<Poll>(`/polls/${pollId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
};

const recordVote = async (
  pollId: string,
  championSlug: string,
  voterId?: string | null,
): Promise<{ poll: Poll; votes: Vote[]; topVotes: TopVote[]; totalVotes: number }> => {
  const response = await request<{
    poll: Poll;
    votes: Array<Record<string, unknown>>;
    topVotes?: unknown[];
    totalVotes?: number;
  }>(`/polls/${pollId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ championSlug, voterId }),
  });

  return {
    poll: response.poll,
    votes: response.votes.map(normalizeVote),
    topVotes: normalizeTopVotes(response.topVotes ?? []),
    totalVotes: Number(response.totalVotes ?? response.votes.length ?? 0),
  };
};

const fetchVotes = async (
  pollId: string,
): Promise<{ poll: Poll; votes: Vote[]; topVotes: TopVote[]; totalVotes: number }> => {
  const response = await request<{
    poll: Poll;
    votes: Array<Record<string, unknown>>;
    topVotes?: unknown[];
    totalVotes?: number;
  }>(`/polls/${pollId}/votes`);

  return {
    poll: response.poll,
    votes: response.votes.map(normalizeVote),
    topVotes: normalizeTopVotes(response.topVotes ?? []),
    totalVotes: Number(response.totalVotes ?? response.votes.length ?? 0),
  };
};

const clearVotes = async (pollId: string) => {
  await request<void>(`/polls/${pollId}/votes`, {
    method: 'DELETE',
  });
};

export type { Poll, Vote };
export { ApiError, clearVotes, createPoll, fetchPoll, fetchVotes, recordVote, updatePollStatus };


import type { PollStatus } from '../types/poll';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
      payload?.error ?? `Request failed with status ${response.status}`,
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

const recordVote = async (pollId: string, championSlug: string, voterId?: string | null) => {
  return request<{ poll: Poll; votes: Vote[] }>(`/polls/${pollId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ championSlug, voterId }),
  });
};

const fetchVotes = async (pollId: string): Promise<{ poll: Poll; votes: Vote[] }> => {
  const response = await request<{ poll: Poll; votes: Array<Record<string, unknown>> }>(
    `/polls/${pollId}/votes`,
  );

  return {
    poll: response.poll,
    votes: response.votes.map((vote) => ({
      pollId: String(vote.poll_id ?? vote.pollId ?? ''),
      voterId:
        vote.voter_id === null || vote.voter_id === undefined
          ? null
          : String(vote.voter_id),
      championSlug: String(vote.champion_slug ?? vote.championSlug ?? ''),
      createdAt: String(vote.created_at ?? vote.createdAt ?? ''),
    })),
  };
};

const clearVotes = async (pollId: string) => {
  await request<void>(`/polls/${pollId}/votes`, {
    method: 'DELETE',
  });
};

export type { Poll, Vote };
export { ApiError, clearVotes, createPoll, fetchPoll, fetchVotes, recordVote, updatePollStatus };

import { io, type Socket } from 'socket.io-client';
import type { PollStatus, TopVote } from '../types/poll';
import type { Poll } from './polls';

const SOCKET_BASE_URL = (
  import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

const createSocket = (): Socket =>
  io(SOCKET_BASE_URL, {
    autoConnect: false,
    transports: ['websocket'],
  });

interface PollVotesEvent {
  pollId: string;
  topVotes: TopVote[];
  totalVotes: number;
}

interface PollStatusEvent {
  pollId: string;
  status: PollStatus;
}

interface PollUpdateEvent {
  poll: Poll;
}

interface PollErrorEvent {
  pollId: string;
  error: string;
}

export type { PollErrorEvent, PollStatusEvent, PollUpdateEvent, PollVotesEvent };
export { SOCKET_BASE_URL, createSocket };

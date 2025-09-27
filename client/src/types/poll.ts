export type PollStatus = 'idle' | 'active' | 'stopped';

export interface TopVote {
  championSlug: string;
  count: number;
}

import { ADMIN_KEY_PREFIX, VOTER_KEY_PREFIX } from '../constants/storage';

export const getIsAdmin = (pollId: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(`${ADMIN_KEY_PREFIX}${pollId}`) === 'true';
};

export const getOrCreateVoterId = (pollId: string): string | null => {
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

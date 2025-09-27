import { getIsAdmin, getOrCreateVoterId } from '../pollIdentity';

const STORAGE_KEY = 'poll-admin:test';
const MOCK_UUID = '123e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
  localStorage.clear();
});

describe('pollIdentity utilities', () => {
  it('detects admin access based on storage', () => {
    expect(getIsAdmin('test')).toBe(false);

    localStorage.setItem(STORAGE_KEY, 'true');
    expect(getIsAdmin('test')).toBe(true);
  });

  it('returns existing voter id if present', () => {
    localStorage.setItem('poll-voter:test', 'voter-123');

    expect(getOrCreateVoterId('test')).toBe('voter-123');
  });

  it('creates and stores a voter id when missing', () => {
    const spy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(MOCK_UUID);

    const voterId = getOrCreateVoterId('test');

    expect(voterId).toBe(MOCK_UUID);
    expect(localStorage.getItem('poll-voter:test')).toBe(MOCK_UUID);
    expect(spy).toHaveBeenCalled();
  });
});

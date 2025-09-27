const VALID_STATUSES = new Set(['idle', 'active', 'stopped']);

const createPollStore = (db) => {
  const insertPoll = db.prepare('INSERT INTO polls (id, status) VALUES (?, ?)');
  const getPoll = db.prepare('SELECT * FROM polls WHERE id = ?');
  const updateStatus = db.prepare(
    'UPDATE polls SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  );
  const insertVote = db.prepare(
    'INSERT INTO poll_votes (poll_id, voter_id, champion_slug) VALUES (?, ?, ?)',
  );
  const deleteVotesForPoll = db.prepare('DELETE FROM poll_votes WHERE poll_id = ?');
  const getVotesForPoll = db.prepare(
    'SELECT poll_id, voter_id, champion_slug, created_at FROM poll_votes WHERE poll_id = ? ORDER BY id ASC',
  );

  const ensureStatus = (status) => {
    if (!VALID_STATUSES.has(status)) {
      throw new Error(`Invalid poll status: ${status}`);
    }
  };

  const create = ({ id, status = 'idle' }) => {
    ensureStatus(status);
    insertPoll.run(id, status);
    return getPoll.get(id);
  };

  const findById = (id) => getPoll.get(id) ?? null;

  const setStatus = (id, status) => {
    ensureStatus(status);
    const result = updateStatus.run(status, id);
    if (result.changes === 0) {
      return null;
    }

    return getPoll.get(id);
  };

  const recordVote = ({ pollId, voterId = null, championSlug }) => {
    insertVote.run(pollId, voterId, championSlug);
    return getVotesForPoll.all(pollId);
  };

  const clearVotes = (pollId) => {
    deleteVotesForPoll.run(pollId);
  };

  const allVotes = (pollId) => getVotesForPoll.all(pollId);

  return {
    create,
    findById,
    setStatus,
    recordVote,
    clearVotes,
    allVotes,
  };
};

module.exports = {
  createPollStore,
  VALID_STATUSES,
};

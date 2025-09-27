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
  const findVoteByVoter = db.prepare(
    'SELECT id FROM poll_votes WHERE poll_id = ? AND voter_id = ? LIMIT 1',
  );
  const deleteVotesForPoll = db.prepare('DELETE FROM poll_votes WHERE poll_id = ?');
  const getVotesForPoll = db.prepare(
    'SELECT poll_id, voter_id, champion_slug, created_at FROM poll_votes WHERE poll_id = ? ORDER BY id ASC',
  );
  const getTopVotesForPoll = db.prepare(
    `SELECT champion_slug AS championSlug, COUNT(*) AS voteCount
     FROM poll_votes
     WHERE poll_id = ?
     GROUP BY champion_slug
     ORDER BY voteCount DESC, championSlug ASC
     LIMIT ?`,
  );
  const getVoteCountForPoll = db.prepare(
    'SELECT COUNT(*) AS totalVotes FROM poll_votes WHERE poll_id = ?',
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

  const topVotes = (pollId, limit = 3) => {
    return getTopVotesForPoll
      .all(pollId, limit)
      .map((row) => ({ championSlug: row.championSlug, count: Number(row.voteCount) }));
  };

  const totalVotes = (pollId) => {
    const row = getVoteCountForPoll.get(pollId);
    return row ? Number(row.totalVotes) : 0;
  };

  const recordVote = ({ pollId, voterId = null, championSlug }) => {
    if (!voterId) {
      const error = new Error('VOTER_ID_REQUIRED');
      error.code = 'VOTER_ID_REQUIRED';
      throw error;
    }

    const existing = findVoteByVoter.get(pollId, voterId);
    if (existing) {
      const error = new Error('ALREADY_VOTED');
      error.code = 'ALREADY_VOTED';
      throw error;
    }

    insertVote.run(pollId, voterId, championSlug);
    return {
      votes: getVotesForPoll.all(pollId),
      topVotes: topVotes(pollId),
      totalVotes: totalVotes(pollId),
    };
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
    topVotes,
    totalVotes,
  };
};

module.exports = {
  createPollStore,
  VALID_STATUSES,
};

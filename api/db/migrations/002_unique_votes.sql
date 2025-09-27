DELETE FROM poll_votes
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM poll_votes
  WHERE voter_id IS NOT NULL
  GROUP BY poll_id, voter_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique_voter
ON poll_votes (poll_id, voter_id)
WHERE voter_id IS NOT NULL;

import { render, screen } from '@testing-library/react';
import PollTopPicks from '../PollTopPicks';

describe('PollTopPicks', () => {
  it('shows empty state when there are no votes', () => {
    render(<PollTopPicks topVotes={[]} totalVotes={0} />);

    expect(screen.getByText(/no votes yet/i)).toBeInTheDocument();
    expect(screen.getByText('0 votes cast')).toBeInTheDocument();
  });

  it('renders standings with champion names and socket warning', () => {
    render(
      <PollTopPicks
        topVotes={[
          { championSlug: 'Elise', count: 2 },
          { championSlug: 'LeeSin', count: 1 },
        ]}
        totalVotes={3}
        socketError="Realtime unavailable"
      />,
    );

    expect(screen.getByText('3 votes cast')).toBeInTheDocument();
    expect(screen.getByText('Realtime unavailable')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Elise')).toBeInTheDocument();
    expect(screen.getByText('Lee Sin')).toBeInTheDocument();
  });
});

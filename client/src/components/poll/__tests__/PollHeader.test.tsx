import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PollHeader from '../PollHeader';
import { mockClipboard } from '../../../test/setupTests';

describe('PollHeader', () => {
  const baseProps = {
    pollId: 'alpha',
    pollStatus: 'idle' as const,
    pollUrl: 'https://app.test/polls/alpha',
  };

  it('renders poll metadata and status label', () => {
    render(<PollHeader {...baseProps} />);

    expect(screen.getByText(/poll id/i)).toHaveTextContent('Poll ID: alpha');
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy poll link/i })).not.toBeInTheDocument();
  });

  it('shows copy button when requested and copies to clipboard', async () => {
    const user = userEvent.setup();
    const clipboard = mockClipboard();

    render(<PollHeader {...baseProps} pollStatus="active" showCopyLink />);

    await user.click(screen.getByRole('button', { name: /copy poll link/i }));

    expect(clipboard.writeText).toHaveBeenCalledWith('https://app.test/polls/alpha');
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();

    clipboard.restore();
  });
});

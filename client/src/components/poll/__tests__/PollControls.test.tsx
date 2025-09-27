import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PollControls from '../PollControls';

describe('PollControls', () => {
  const defaultProps = {
    pollStatus: 'idle' as const,
    isUpdatingPoll: false,
    statusMessage: null,
    statusError: null,
    onStartPoll: vi.fn(),
    onStopPoll: vi.fn(),
    onRestartPoll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables buttons based on poll status', () => {
    const { rerender } = render(<PollControls {...defaultProps} />);

    expect(screen.getByRole('button', { name: /^start$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^restart$/i })).toBeDisabled();

    rerender(<PollControls {...defaultProps} pollStatus="active" />);

    expect(screen.getByRole('button', { name: /^start$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^restart$/i })).toBeEnabled();
  });

  it('disables all buttons while updating', () => {
    render(<PollControls {...defaultProps} isUpdatingPoll />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('invokes callbacks when buttons clicked', async () => {
    const user = userEvent.setup();
    render(
      <PollControls
        {...defaultProps}
        pollStatus="active"
        onStartPoll={defaultProps.onStartPoll}
        onStopPoll={defaultProps.onStopPoll}
        onRestartPoll={defaultProps.onRestartPoll}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^stop$/i }));
    await user.click(screen.getByRole('button', { name: /^restart$/i }));

    expect(defaultProps.onStopPoll).toHaveBeenCalledTimes(1);
    expect(defaultProps.onRestartPoll).toHaveBeenCalledTimes(1);
  });

  it('renders status messages and errors', () => {
    render(
      <PollControls
        {...defaultProps}
        statusMessage="Poll opened"
        statusError="Failed"
      />,
    );

    expect(screen.getByText('Poll opened')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});

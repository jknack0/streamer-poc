import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LockInButton from '../LockInButton';

describe('LockInButton', () => {
  it('renders provided label and is enabled by default', () => {
    render(<LockInButton label="Lock In" />);

    expect(screen.getByRole('button', { name: 'Lock In' })).toBeEnabled();
  });

  it('disables the button when disabled prop is true', () => {
    render(<LockInButton label="Lock In" disabled />);

    expect(screen.getByRole('button', { name: 'Lock In' })).toBeDisabled();
  });

  it('shows loading label and disables while loading', () => {
    render(<LockInButton label="Lock In" loading />);

    const button = screen.getByRole('button', { name: 'Locking In...' });
    expect(button).toBeDisabled();
  });

  it('invokes onClick handler when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<LockInButton label="Lock In" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Lock In' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<LockInButton label="Lock In" disabled onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Lock In' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

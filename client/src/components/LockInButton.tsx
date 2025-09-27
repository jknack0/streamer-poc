interface LockInButtonProps {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onClick?: () => void;
}

const LockInButton = ({ disabled = false, label, loading = false, onClick }: LockInButtonProps) => {
  const effectiveDisabled = disabled || loading;
  const buttonLabel = loading ? 'Locking In...' : label;

  return (
    <button type="button" className="lock-in-button" disabled={effectiveDisabled} onClick={onClick}>
      {buttonLabel}
    </button>
  );
};

export default LockInButton;

const OverlayDisplay = () => {
  return (
    <div className="overlay-display">
      <header className="overlay-display__header">
        <span className="overlay-display__title">Champ Request</span>
        <span className="overlay-display__amount">$30</span>
      </header>
      <ol className="overlay-display__list" start={2}>
        <li className="overlay-display__list-item">Pyke</li>
        <li className="overlay-display__list-item">Shivana</li>
        <li className="overlay-display__list-item">Amumu</li>
      </ol>
    </div>
  );
};

export default OverlayDisplay;

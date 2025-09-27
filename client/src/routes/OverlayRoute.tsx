import { useEffect } from 'react';
import OverlayDisplay from '../components/OverlayDisplay';

const OverlayRoute = () => {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('overlay-mode');
    document.body.classList.add('overlay-mode');

    return () => {
      html.classList.remove('overlay-mode');
      document.body.classList.remove('overlay-mode');
    };
  }, []);

  return (
    <main className="overlay-route">
      <OverlayDisplay />
    </main>
  );
};

export default OverlayRoute;

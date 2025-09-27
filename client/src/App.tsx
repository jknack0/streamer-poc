import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import HomeRoute from './routes/HomeRoute';
import PollRoute from './routes/PollRoute';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/polls/:pollId" element={<PollRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

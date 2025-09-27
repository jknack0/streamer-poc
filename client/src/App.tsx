import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import HomeRoute from './routes/HomeRoute';
import AdminPollRoute from './routes/AdminPollRoute';
import ParticipantPollRoute from './routes/ParticipantPollRoute';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/polls/:pollId" element={<ParticipantPollRoute />} />
      <Route path="/polls/:pollId/admin" element={<AdminPollRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

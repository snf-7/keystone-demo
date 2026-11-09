import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import Decision from './pages/Decision';
import Radar from './pages/Radar';
import Vacancy from './pages/Vacancy';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/radar" replace />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/vacancy/:positionId" element={<Vacancy />} />
        <Route path="/decision/:vacancyId" element={<Decision />} />
      </Route>
    </Routes>
  );
}

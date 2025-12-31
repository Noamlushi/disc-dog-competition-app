import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompetitionPage from './pages/CompetitionPage';
import ResultsPage from './pages/ResultsPage';
import OrderOfGoPage from './pages/OrderOfGoPage';
import StartCompetitionPage from './pages/StartCompetitionPage';
import DistanceScoringPage from './pages/DistanceScoringPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/competition/:id" element={<CompetitionPage />} />
          <Route path="/competition/:id/results" element={<ResultsPage />} />
          <Route path="/competition/:id/order" element={<OrderOfGoPage />} />
          <Route path="/competition/:id/start" element={<StartCompetitionPage />} />
          <Route path="/competition/:id/score/distance/:teamId" element={<DistanceScoringPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

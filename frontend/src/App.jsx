import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompetitionPage from './pages/CompetitionPage';
import ResultsPage from './pages/ResultsPage';
import OrderOfGoPage from './pages/OrderOfGoPage';
import StartCompetitionPage from './pages/StartCompetitionPage';
import DistanceScoringPage from './pages/DistanceScoringPage';
import MultipleScoringPage from './pages/MultipleScoringPage';
import FrisagilityScoringPage from './pages/FrisagilityScoringPage';
import FreestyleScoringPage from './pages/FreestyleScoringPage';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans transition-colors duration-300 dark:bg-slate-900 dark:text-gray-100">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/competition/:id" element={<CompetitionPage />} />
            <Route path="/competition/:id/results" element={<ResultsPage />} />
            <Route path="/competition/:id/order" element={<OrderOfGoPage />} />
            <Route path="/competition/:id/start" element={<StartCompetitionPage />} />
            <Route path="/competition/:id/judge" element={<StartCompetitionPage />} />
            <Route path="/competition/:id/live" element={<StartCompetitionPage />} />
            <Route path="/competition/:id/score/distance/:teamId" element={<DistanceScoringPage />} />
            <Route path="/competition/:id/score/multiple/:teamId" element={<MultipleScoringPage />} />
            <Route path="/competition/:id/score/frisagility/:teamId" element={<FrisagilityScoringPage />} />
            <Route path="/competition/:id/score/freestyle/:teamId" element={<FreestyleScoringPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

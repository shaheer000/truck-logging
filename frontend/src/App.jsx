import { Routes, Route, Link, NavLink, Navigate, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import TripInputWizard from "./pages/TripInputWizard.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import LogSheetViewer from "./pages/LogSheetViewer.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import { useThemeStore, useAuthStore } from "./store/tripStore.js";

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function Nav() {
  const { dark, toggle } = useThemeStore();
  const { driver, token, logout } = useAuthStore();
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-micro ${
      isActive ? "text-text-primary bg-surface-2" : "text-text-muted hover:bg-surface-2"
    }`;

  return (
    <nav className="app-nav sticky top-0 z-[1000] h-14 bg-surface/95 backdrop-blur border-b border-border">
      <div className="max-w-content mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-text-primary">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-primary text-sm">🚛</span>
          <span className="font-display text-lg font-semibold">
            Truck<span className="text-primary">Log</span> Pro
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {token && (
            <>
              <NavLink to="/plan" className={linkClass}>Plan Trip</NavLink>
              <NavLink to="/results" className={linkClass}>Results</NavLink>
              <NavLink to="/logs" className={linkClass}>Logs</NavLink>
              <NavLink to="/history" className={linkClass}>History</NavLink>
            </>
          )}
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="ml-1 min-h-[44px] min-w-[44px] grid place-items-center rounded-md hover:bg-surface-2"
          >
            {dark ? "☀️" : "🌙"}
          </button>
          {token ? (
            <div className="flex items-center gap-2 ml-1">
              <span className="hidden sm:inline text-sm text-text-secondary">
                {driver?.full_name || driver?.username}
              </span>
              <button onClick={logout} className="btn-ghost !min-h-0 py-1.5 text-[13px]">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-ghost !min-h-0 py-1.5 text-[13px] ml-1">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const chromeless = pathname === "/" || pathname === "/login";

  return (
    <div className="min-h-full flex flex-col">
      {!chromeless && <Nav />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/plan" element={<RequireAuth><TripInputWizard /></RequireAuth>} />
          <Route path="/results" element={<RequireAuth><ResultsPage /></RequireAuth>} />
          <Route path="/logs" element={<RequireAuth><LogSheetViewer /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}

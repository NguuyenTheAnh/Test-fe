import { Link, Outlet, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./styles/global.css";

const App = () => {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          <span className="brand-text">Rental Finder</span>
        </div>
        <nav className="nav-links">
          <Link className={location.pathname === "/" ? "active" : ""} to="/">
            Search
          </Link>
          <Link
            className={location.pathname === "/add" ? "active" : ""}
            to="/add"
          >
            Add House
          </Link>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default App;

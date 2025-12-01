import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { ensureDefaultIcon } from "../util/leaflet";

const API_BASE = "http://localhost:8080/api";
const DEFAULT_CENTER = [21.0285, 105.8544];

const toLatLngPairs = (coords = []) =>
  coords
    .map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const [lng, lat] = pair;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    })
    .filter(Boolean);

const asLatLng = (point) => {
  if (!point) return null;
  if (Array.isArray(point) && point.length >= 2) {
    const [lat, lng] = point;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  const lat =
    point.lat ??
    point.latitude ??
    point.latDeg ??
    point.latdeg;
  const lng =
    point.lng ??
    point.longitude ??
    point.lon ??
    point.long ??
    point.lngDeg ??
    point.lngdeg;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return [Number(lat), Number(lng)];
  }
  return null;
};

const HomePage = () => {
  const [schoolName, setSchoolName] = useState("");
  const [routes, setRoutes] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingHouses, setLoadingHouses] = useState(false);
  const [error, setError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeMap, setRouteMap] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    ensureDefaultIcon();
  }, []);

  const loadHouses = useCallback(async () => {
    setLoadingHouses(true);
    try {
      const response = await axios.get(`${API_BASE}/houses`);
      setHouses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch houses", err);
    } finally {
      setLoadingHouses(false);
    }
  }, []);

  useEffect(() => {
    loadHouses();
  }, [loadHouses]);

  useEffect(() => {
    if (location.state?.refreshHouses) {
      loadHouses();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, loadHouses, navigate]);

  const handleSearch = async () => {
    if (!schoolName.trim()) {
      setError("Please enter a school name.");
      return;
    }
    setError("");
    setLoadingRoutes(true);
    try {
      const response = await axios.get(`${API_BASE}/routes`, {
        params: { schoolName },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      const trimmedName = schoolName.trim();
      const decorated = data.map((route) => ({
        ...route,
        schoolName: route.schoolName ?? trimmedName,
      }));
      setRoutes(decorated);
    } catch (err) {
      console.error("Failed to search routes", err);
      setError("Could not load routes. Please try again.");
    } finally {
      setLoadingRoutes(false);
    }
  };

  const sortedRoutes = useMemo(() => {
    const clone = [...routes];
    return clone.sort(
      (a, b) => (a?.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b?.distanceKm ?? Number.MAX_SAFE_INTEGER)
    );
  }, [routes]);

  const geometry = useMemo(() => {
    if (!selectedRoute) return [];
    return toLatLngPairs(
      selectedRoute.geometry ||
      selectedRoute.coordinates ||
      selectedRoute.routeGeometry ||
      []
    );
  }, [selectedRoute]);

  const housePoint =
    asLatLng(selectedRoute?.house) ||
    asLatLng(selectedRoute?.origin) ||
    asLatLng(selectedRoute?.from) ||
    (geometry.length ? geometry[0] : null);
  const schoolPoint =
    asLatLng(selectedRoute?.school) ||
    asLatLng(selectedRoute?.destination) ||
    asLatLng(selectedRoute?.to) ||
    (geometry.length ? geometry[geometry.length - 1] : null);

  const mapCenter =
    geometry[Math.floor(geometry.length / 2)] ||
    housePoint ||
    schoolPoint ||
    DEFAULT_CENTER;

  useEffect(() => {
    if (routeMap && selectedRoute) {
      routeMap.setView(mapCenter, 14);
    }
  }, [routeMap, selectedRoute, mapCenter]);

  const formatDistance = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "N/A";
    return `${numeric.toFixed(2)} km`;
  };

  const closeModal = () => {
    setSelectedRoute(null);
    setRouteMap(null);
  };

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Feature A — Search routes</p>
          <h1>Find rental rooms close to your university</h1>
          <p className="muted">
            Type a school name, fetch suggested routes, and open a map to view
            the path from house to campus.
          </p>
          <div className="actions">
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="University or campus name"
              className="text-input"
            />
            <button className="primary" onClick={handleSearch} disabled={loadingRoutes}>
              {loadingRoutes ? "Searching..." : "Search"}
            </button>
            <Link className="ghost" to="/add">
              Add House
            </Link>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Routes</p>
            <h3>Results sorted by distance</h3>
          </div>
          {loadingRoutes && <span className="pill muted">Loading...</span>}
        </div>
        {sortedRoutes.length === 0 && !loadingRoutes && (
          <p className="muted">No routes yet. Search by school to see matches.</p>
        )}
        <div className="grid">
          {sortedRoutes.map((route, idx) => (
            <div className="card" key={route.id ?? idx}>
              <div className="card-header">
                <div>
                  <p className="eyebrow">{route.schoolName ?? route.school?.name ?? "School"}</p>
                  <h4>{route.house?.name ?? route.houseName ?? "House option"}</h4>
                </div>
                <span className="pill">{formatDistance(route.distanceKm ?? route.distance)}</span>
              </div>
              <p className="muted small">
                {route.house?.address ?? route.address ?? "Address unavailable"}
              </p>
              <div className="card-actions">
                <button className="ghost" onClick={() => setSelectedRoute(route)}>
                  View Map
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Feature B — Houses</p>
            <h3>Rental houses we know about</h3>
          </div>
          {loadingHouses && <span className="pill muted">Refreshing...</span>}
        </div>
        {houses.length === 0 && !loadingHouses && (
          <p className="muted">No houses yet. Add one from the map to get started.</p>
        )}
        <div className="grid">
          {houses.map((house) => (
            <div className="card" key={house.id ?? `${house.name}-${house.lat ?? house.latitude}`}>
              <h4>{house.name ?? "House"}</h4>
              <p className="muted small">{house.address ?? "Address not provided"}</p>
              <div className="coords">
                <span>Lat: {house.lat ?? house.latitude ?? "?"}</span>
                <span>Lng: {house.lng ?? house.longitude ?? "?"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedRoute && (
        <div className="modal">
          <div className="modal-body">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Route preview</p>
                <h3>{selectedRoute.schoolName ?? selectedRoute.school?.name ?? "Route"}</h3>
              </div>
              <button className="ghost" onClick={closeModal}>
                Close
              </button>
            </div>
            <div className="map-shell">
              <MapContainer
                center={mapCenter}
                zoom={14}
                whenCreated={setRouteMap}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {geometry.length > 0 && (
                  <Polyline positions={geometry} color="#3b82f6" weight={5} />
                )}
                {housePoint && (
                  <Marker position={housePoint}>
                    <Popup>House</Popup>
                  </Marker>
                )}
                {schoolPoint && (
                  <Marker position={schoolPoint} icon={new L.DivIcon({ className: "school-marker", html: "🎓" })}>
                    <Popup>School</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

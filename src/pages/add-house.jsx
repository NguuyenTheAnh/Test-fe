import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { ensureDefaultIcon } from "../util/leaflet";

const API_BASE = "http://localhost:8080/api";
const FALLBACK_CENTER = [21.0285, 105.8544];

const MapClickCatcher = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const AddHousePage = () => {
  const [mapCenter, setMapCenter] = useState(FALLBACK_CENTER);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [map, setMap] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [geoStatus, setGeoStatus] = useState("Centering on your location...");
  const navigate = useNavigate();

  useEffect(() => {
    ensureDefaultIcon();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation unavailable. Using default center.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setMapCenter(coords);
        setMarkerPosition(coords);
        setGeoStatus("Location detected. Drop a pin to adjust.");
      },
      () => {
        setGeoStatus("Could not detect location. Using default center.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (map && mapCenter) {
      map.setView(mapCenter, 15);
    }
  }, [map, mapCenter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!markerPosition) {
      setError("Please place a marker on the map.");
      return;
    }
    if (!name.trim() || !address.trim()) {
      setError("Name and address are required.");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/houses`, {
        name: name.trim(),
        address: address.trim(),
        lat: markerPosition[0],
        lng: markerPosition[1],
      });
      navigate("/", { state: { refreshHouses: true } });
    } catch (err) {
      console.error("Failed to save house", err);
      setError("Could not save house. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const coordsText = useMemo(() => {
    if (!markerPosition) return "Click on the map to drop a pin.";
    const [lat, lng] = markerPosition;
    return `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`;
  }, [markerPosition]);

  return (
    <div className="page">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Feature B</p>
            <h3>Add a rental house</h3>
          </div>
          <button className="ghost" onClick={() => navigate("/")}>
            Back
          </button>
        </div>

        <p className="muted">{geoStatus}</p>

        <div className="map-shell tall">
          <MapContainer
            center={mapCenter}
            zoom={15}
            whenCreated={setMap}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickCatcher onSelect={setMarkerPosition} />
            {markerPosition && <Marker position={markerPosition} />}
          </MapContainer>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Name</label>
            <input
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="House name"
            />
          </div>
          <div className="form-row">
            <label>Address</label>
            <input
              className="text-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city"
            />
          </div>
          <div className="form-row">
            <label>Coordinates</label>
            <input className="text-input" value={coordsText} readOnly />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="card-actions">
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AddHousePage;

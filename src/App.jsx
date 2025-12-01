import React, { useEffect, useState } from "react";
import keycloak from "./keycloak.js";

const API_BASE = "http://localhost:8081";

const fetchWithAuth = async (path) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${keycloak.token}`,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string" && payload
        ? payload
        : response.statusText || "Request failed";
    throw new Error(message);
  }

  return payload;
};

const formatPayload = (data) =>
  typeof data === "string" ? data : JSON.stringify(data, null, 2);

function App() {
  const [username, setUsername] = useState(
    keycloak.tokenParsed?.preferred_username ?? ""
  );
  const [apiResult, setApiResult] = useState({
    public: "",
    user: "",
    admin: "",
  });
  const [roles, setRoles] = useState(null);

  useEffect(() => {
    const syncUser = () =>
      setUsername(keycloak.tokenParsed?.preferred_username ?? "");
    syncUser();

    keycloak.onAuthRefreshSuccess = syncUser;
    keycloak.onTokenExpired = () =>
      keycloak.updateToken(0).catch(() => keycloak.login());

    return () => {
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, []);

  const handleLogin = () => keycloak.login();
  const handleRegister = () => keycloak.register();
  const handleLogout = () =>
    keycloak.logout({
      redirectUri: window.location.origin,
    });

  const callEndpoint = async (path, key) => {
    setApiResult((prev) => ({ ...prev, [key]: "Loading..." }));
    try {
      const data = await fetchWithAuth(path);
      setApiResult((prev) => ({
        ...prev,
        [key]: formatPayload(data),
      }));
    } catch (error) {
      setApiResult((prev) => ({
        ...prev,
        [key]: `Error: ${error.message}`,
      }));
    }
  };

  const loadRoles = async () => {
    setRoles({ status: "Loading..." });
    try {
      const data = await fetchWithAuth("/api/user/roles");
      setRoles(data);
    } catch (error) {
      setRoles({ error: error.message });
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h1>Keycloak + React + Vite</h1>
      <div>
        <strong>Username:</strong>{" "}
        {username || "Username not found in token"}
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleRegister}>Register</button>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button onClick={() => callEndpoint("/api/public/hello", "public")}>
          Call Public API
        </button>
        <button onClick={() => callEndpoint("/api/user/hello", "user")}>
          Call User API
        </button>
        <button onClick={() => callEndpoint("/api/admin/hello", "admin")}>
          Call Admin API
        </button>
        <button onClick={loadRoles}>Load Roles</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "12px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Public API</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{apiResult.public}</pre>
        </section>
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "12px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>User API</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{apiResult.user}</pre>
        </section>
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "12px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Admin API</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{apiResult.admin}</pre>
        </section>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "6px",
          padding: "12px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Roles (JSON)</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {roles ? formatPayload(roles) : "Not loaded"}
        </pre>
      </section>
    </div>
  );
}

export default App;

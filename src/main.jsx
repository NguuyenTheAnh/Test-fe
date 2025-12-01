import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import keycloak from "./keycloak.js";

const rootElement = document.getElementById("root");

const renderApp = () => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

keycloak
  .init({ onLoad: "login-required" })
  .then((authenticated) => {
    if (!authenticated) {
      return keycloak.login();
    }

    setInterval(() => {
      keycloak
        .updateToken(70)
        .catch(() => keycloak.login());
    }, 30000);

    renderApp();
    return null;
  })
  .catch((error) => {
    console.error("Failed to initialize Keycloak", error);
    keycloak.login();
  });

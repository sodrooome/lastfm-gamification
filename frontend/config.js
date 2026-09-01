// frontend/config.js
// Shared API base resolution for app.js and compare.js.

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocal
  ? "http://localhost:8000"
  : "https://43-134-108-8.sslip.io";

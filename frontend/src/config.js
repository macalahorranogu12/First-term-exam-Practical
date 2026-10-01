// Configuración centralizada de la URL de FastAPI
const DEFAULT_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getApiUrl = () => {
  return localStorage.getItem("api_url") || DEFAULT_URL;
};

export const setApiUrl = (url) => {
  if (url) {
    // Quitar barra diagonal final si existe
    const cleanUrl = url.trim().replace(/\/+$/, "");
    localStorage.setItem("api_url", cleanUrl);
  }
};

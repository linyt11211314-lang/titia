import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TitiaApp } from "../app/TitiaApp";
import "../app/globals.css";
import "../app/mobile-fixes.css";

const root = document.getElementById("root");

if (!root) throw new Error("Titia root element is missing");

createRoot(root).render(
  <StrictMode>
    <TitiaApp />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  });
}

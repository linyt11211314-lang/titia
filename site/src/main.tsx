import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TitiaApp } from "../app/TitiaApp";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("Titia root element is missing");

createRoot(root).render(
  <StrictMode>
    <TitiaApp />
  </StrictMode>,
);


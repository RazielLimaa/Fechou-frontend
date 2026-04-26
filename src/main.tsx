import { createRoot } from "react-dom/client";
import App from "./App";
import "./i18n";
import "lenis/dist/lenis.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPostHog } from "./lib/posthog";

// Initialize PostHog analytics
initPostHog();

createRoot(document.getElementById("root")!).render(<App />);

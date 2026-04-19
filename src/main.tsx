import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

if (!convexUrl) {
  createRoot(document.getElementById("root")!).render(
    <div style={{ padding: "20px", fontFamily: "sans-serif", textAlign: "center", marginTop: "100px" }}>
      <h1 style={{ color: "red" }}>Configuration Error</h1>
      <p>The application is missing the <b>VITE_CONVEX_URL</b> environment variable.</p>
      <p>Please configure this variable in your hosting provider (e.g. Railway Variables) to load the application.</p>
    </div>
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  createRoot(document.getElementById("root")!).render(
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>,
  );
}

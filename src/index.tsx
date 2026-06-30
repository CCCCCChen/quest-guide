import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { AppContainer, ErrorRender } from "@lark-apaas/client-toolkit-lite";
import App from "./app";
import "./index.css";

function normalizeBasename(value: string | undefined) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
  return value;
}

const isFileProtocol = window.location.protocol === "file:";
const Router = isFileProtocol ? HashRouter : BrowserRouter;
const clientBasePath =
  (typeof process !== "undefined" &&
    process.env &&
    typeof process.env.CLIENT_BASE_PATH === "string" &&
    process.env.CLIENT_BASE_PATH) ||
  "/";
const basename = isFileProtocol ? undefined : normalizeBasename(clientBasePath);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router basename={basename}>
      <AppContainer>
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorRender error={error} resetErrorBoundary={resetErrorBoundary} />
          )}
        >
          <App />
        </ErrorBoundary>
      </AppContainer>
    </Router>
  </StrictMode>,
);

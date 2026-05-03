import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@/shared/styles/index.css";
import "@/shared/styles/globals.css";
import { LoadingProvider } from "./shared/contexts/LoadingContext";
import { GlobalLoader } from "./shared/components/GlobalLoader";

createRoot(document.getElementById("root")!).render(
  <LoadingProvider>
    <GlobalLoader />
    <App />
  </LoadingProvider>
);
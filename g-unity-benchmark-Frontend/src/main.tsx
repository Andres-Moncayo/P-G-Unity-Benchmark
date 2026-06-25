import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/global.css";

// Instanciamos el cliente de consultas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Si falla, re-intenta 1 vez
      refetchOnWindowFocus: false, // No hacer fetch cada vez que cambias de pestaña
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // Configuración del proveedor de consultas
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

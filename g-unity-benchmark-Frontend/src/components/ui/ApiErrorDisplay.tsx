import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { ApiError } from "../../services/apiClient";
import {
  isDatabaseUnavailableError,
} from "../../features/analytics/utils/analyticsApiErrors";

interface ApiErrorDisplayProps {
  error: unknown;
  title?: string;
  className?: string;
}

export function ApiErrorDisplay({
  error,
  title = "No se pudieron cargar los datos",
  className = "",
}: ApiErrorDisplayProps) {
  const isDbUnavailable = isDatabaseUnavailableError(error);
  
  // Detect standard fetch failure or network error
  const isFetchFailed = 
    !error || 
    (error instanceof Error && 
      (error.message.includes("Failed to fetch") || 
       error.message.includes("NetworkError") || 
       error.message.includes("fetch failed") || 
       error.name === "TypeError")) ||
    (typeof error === "object" && 
      "message" in error && 
      typeof (error as any).message === "string" && 
      ((error as any).message.includes("Failed to fetch") || 
       (error as any).message.includes("fetch failed")));

  let technicalMessage = "";
  if (error instanceof ApiError) {
    technicalMessage = error.message;
  } else if (error instanceof Error) {
    technicalMessage = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    technicalMessage = String((error as any).message);
  } else {
    technicalMessage = "Error de conexión con la API.";
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-[#FF4C4C]/30 bg-[#FF4C4C]/5 px-4 py-6 text-center ${className}`}>
      <FontAwesomeIcon
        icon={faExclamationTriangle}
        className={`text-[20px] ${isDbUnavailable ? "text-amber-400 animate-pulse" : "text-[#FF4C4C]"}`}
      />
      <p className="text-[13px] font-semibold text-[#FCA5A5]">
        {title}
      </p>
      
      <p className="text-[10px] text-[#94A3B8] font-mono bg-black/40 px-2 py-0.5 rounded max-w-full overflow-x-auto">
        {technicalMessage}
      </p>

      {isDbUnavailable ? (
        <p className="text-[11px] text-gray-400 max-w-[320px] mt-1 leading-relaxed">
          El backend responde pero no conecta a PostgreSQL. Revisa{" "}
          <span className="font-mono text-amber-200 bg-amber-950/40 px-1 py-0.5 rounded">DATABASE_URL</span> en
          el <span className="font-mono text-amber-200 bg-amber-950/40 px-1 py-0.5 rounded">.env</span> del
          backend y que el servicio esté accesible desde tu red.
        </p>
      ) : isFetchFailed ? (
        <p className="text-[11px] text-gray-400 max-w-[320px] mt-1 leading-relaxed">
          El backend no responde o no está encendido. Revisa que el servidor backend esté corriendo y sea accesible.
        </p>
      ) : (
        <p className="text-[11px] text-gray-400 max-w-[320px] mt-1 leading-relaxed">
          Comprueba la conexión con el servidor o consulta a tu administrador.
        </p>
      )}
    </div>
  );
}

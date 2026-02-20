import { cn } from "../../lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "connected" | "disconnected";
  method?: "oauth" | "api_key" | null;
}

export function StatusBadge({ status, method }: StatusBadgeProps) {
  if (status === "disconnected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400">
        <XCircle className="w-3 h-3" />
        Nao conectada
      </span>
    );
  }

  const label =
    method === "oauth" ? "Conta MP conectada (OAuth)" : "Conta MP conectada (API Key)";

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 border border-green-500/30 text-green-400">
      <CheckCircle className="w-3 h-3" />
      {label}
    </span>
  );
}

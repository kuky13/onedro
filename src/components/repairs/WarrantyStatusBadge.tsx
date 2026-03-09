import React from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WarrantyStatusBadgeFormat = "dashboard" | "short";

const getVariant = (status: string) => {
  switch (status) {
    case "in_progress":
      return "secondary" as const;
    case "completed":
      return "default" as const;
    case "delivered":
      return "outline" as const;
    default:
      return "outline" as const;
  }
};

const getLabel = (status: string, format: WarrantyStatusBadgeFormat) => {
  if (format === "short") {
    switch (status) {
      case "in_progress":
        return "Em andamento";
      case "completed":
        return "Concluída";
      case "delivered":
        return "Entregue";
      default:
        return status;
    }
  }

  switch (status) {
    case "in_progress":
      return "Garantia ativa";
    case "completed":
      return "Garantia concluída";
    case "delivered":
      return "Garantia entregue";
    default:
      return "Garantia";
  }
};

export function WarrantyStatusBadge({
  status,
  reopenCount = 0,
  format = "dashboard",
  className,
}: {
  status?: string | null;
  reopenCount?: number;
  format?: WarrantyStatusBadgeFormat;
  className?: string;
}) {
  if (!status) return null;

  const variant = getVariant(status);
  const label = getLabel(status, format);

  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Shield className="h-3 w-3" />
      <span>{label}</span>
      {reopenCount > 0 && <span>{` (${reopenCount + 1}ª)`}</span>}
    </Badge>
  );
}

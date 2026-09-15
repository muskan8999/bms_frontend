import type { PaymentStatus, RentalStatus } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const rentalTone: Record<RentalStatus, { tone: BadgeTone; label: string; dot: string }> = {
  active: { tone: "brand", label: "Active", dot: "bg-brand" },
  returned: { tone: "success", label: "Returned", dot: "bg-success" },
  overdue: { tone: "danger", label: "Overdue", dot: "bg-danger" },
  draft: { tone: "neutral", label: "Draft", dot: "bg-ink-muted" },
  cancelled: { tone: "neutral", label: "Cancelled", dot: "bg-ink-muted" },
};

const paymentTone: Record<PaymentStatus, { tone: BadgeTone; label: string; dot: string }> = {
  paid: { tone: "success", label: "Paid", dot: "bg-success" },
  pending: { tone: "amber", label: "Pending", dot: "bg-amber" },
  partial: { tone: "info", label: "Part paid", dot: "bg-info" },
};

export function StatusBadge({ status }: { status: RentalStatus }) {
  const config = rentalTone[status];
  return (
    <Badge tone={config.tone}>
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden />
      {config.label}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = paymentTone[status];
  return (
    <Badge tone={config.tone}>
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden />
      {config.label}
    </Badge>
  );
}

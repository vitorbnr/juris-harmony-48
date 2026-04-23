import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
  delay?: number;
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  changeType = "neutral",
  className,
  delay = 0,
}: StatCardProps) => {
  return (
    <div
      className={cn(
        "surface-card relative overflow-hidden rounded-[1.35rem] border border-border/80 p-5 opacity-0 animate-fade-in",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {change && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              changeType === "positive" && "bg-primary/15 text-primary",
              changeType === "negative" && "bg-destructive/15 text-destructive",
              changeType === "neutral" && "bg-muted/80 text-muted-foreground",
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-heading font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

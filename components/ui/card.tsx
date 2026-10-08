import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-surface p-5 shadow-card animate-fade-up", className)} {...props} />;
}

export function CardHeader({ title, action, icon, className }: { title: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("px-1 text-xs font-medium uppercase tracking-[0.08em] text-ink-3", className)}>{children}</h2>;
}

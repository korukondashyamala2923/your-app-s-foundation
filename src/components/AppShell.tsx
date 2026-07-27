import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-5">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-foreground">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

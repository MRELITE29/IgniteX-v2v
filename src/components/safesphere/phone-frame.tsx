import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Centers the mobile-first experience on larger screens so it reads like a
 * real device, while remaining full-bleed on actual phones.
 */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_oklch(0.93_0.09_148.7)_0%,_oklch(0.97_0.005_120)_45%,_oklch(0.94_0.004_120)_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background shadow-[0_40px_120px_-40px_oklch(0.4_0.02_260/0.5)] sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:overflow-hidden sm:rounded-[2.75rem] sm:border sm:border-border/60">
        <div className={cn("relative flex flex-1 flex-col", className)}>{children}</div>
      </div>
    </div>
  );
}
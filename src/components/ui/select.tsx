import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Native Auswahlliste im Look der shadcn-Inputs (funktioniert ohne JavaScript in Formularen). */
function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "[&>option]:bg-background [&>option]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Select };

import * as React from "react";
import { cn } from "@/lib/utils";

/** Select HTML native dengan gaya shadcn — ringan & ramah perangkat TV/HP lama. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50 md:text-sm [&>option]:bg-background",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-input bg-card/75 px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ring-offset-background transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-primary/35 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

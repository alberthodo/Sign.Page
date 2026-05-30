"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange"
> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        data-state={checked ? "checked" : "unchecked"}
        onChange={(event) => {
          onCheckedChange?.(event.target.checked);
        }}
        className={cn(
          "peer inline-flex h-6 w-10 shrink-0 cursor-pointer appearance-none items-center rounded-full border",
          "bg-muted transition-[background-color,border-color] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "data-[state=checked]:border-primary/50 data-[state=checked]:bg-primary",
          "data-[state=unchecked]:border-border data-[state=unchecked]:bg-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "before:pointer-events-none before:block before:size-5 before:rounded-full before:bg-background before:shadow before:transition-transform before:duration-200",
          "data-[state=checked]:before:translate-x-4 data-[state=unchecked]:before:translate-x-0.5",
          className,
        )}
        {...props}
      />
    );
  },
);

Switch.displayName = "Switch";

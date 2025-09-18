// components/ui/select.tsx
"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

type TriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
  className?: string;
};

export const Select = SelectPrimitive.Root;

export const SelectTrigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        {...props}
        className={`w-full h-[60px] px-4 py-0 inline-flex items-center justify-between rounded-lg border border-gray-300 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 ${className}`}
      >
        {children}
         <SelectPrimitive.Icon asChild>
        <ChevronDown className="ml-2 h-5 w-5 text-gray-400 group-data-[state=open]:text-[#9A813F]" />
      </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue: React.FC<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
> = ({ children, ...props }) => {
  return <SelectPrimitive.Value {...props}>{children}</SelectPrimitive.Value>;
};

export const SelectContent: React.FC<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { className?: string }
> = ({ children, className = "", ...props }) => {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...props}
        className={`z-50 w-full rounded-md border bg-white shadow-lg py-1 ${className}`}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { className?: string }>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <SelectPrimitive.Item
        ref={ref}
        {...props}
        className={`relative flex items-center h-10 px-3 rounded-md text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 focus:bg-[#f8f1e6] ${className}`}
      >
        <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
          {/* <Check className="w-4 h-4 text-[#9A813F]" /> */}
        </SelectPrimitive.ItemIndicator>
        <SelectPrimitive.ItemText className="ml-6">{children}</SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    );
  }
);
SelectItem.displayName = "SelectItem";

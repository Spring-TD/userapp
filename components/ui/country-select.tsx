"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountries } from "@/hooks/useCountries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  className,
  triggerClassName,
  disabled,
}: CountrySelectProps) {
  const { countries, loading, error } = useCountries();

  return (
    <Select
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={triggerClassName} data-state={error ? "error" : undefined}>
        <SelectValue placeholder={loading ? "Loading…" : error ?? placeholder} />
      </SelectTrigger>
      <SelectContent
        className={cn(className, "p-0")}
        position="popper"
      >
        <div className="max-h-72 overflow-y-auto p-1">
          {countries.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {loading ? "Loading countries…" : "No countries available"}
            </div>
          ) : (
            countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

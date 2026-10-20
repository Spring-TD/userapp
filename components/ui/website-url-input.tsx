"use client";

import * as React from "react";
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl";

interface WebsiteUrlInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * URL/website input: ensure value starts with https:// when user types (no double prefix).
 * Parent should default value to WEBSITE_URL_PREFIX.
 */
export function WebsiteUrlInput({ value, onChange, placeholder = "example.com", ...props }: WebsiteUrlInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (next.startsWith("https://") || next.startsWith("http://") || next === "") {
      onChange(next);
      return;
    }
    onChange(WEBSITE_URL_PREFIX + next);
  };
  return <input type="url" value={value} onChange={handleChange} placeholder={placeholder} {...props} />;
}

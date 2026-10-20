"use client";

import { useState, useEffect } from "react";
import { fetchCountries } from "@/lib/countryApi";
import type { CountryOption } from "@/lib/countryApi";

export function useCountries() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Defer fetch so it doesn't block first paint or typing on pages that share the same root
    const id = setTimeout(() => {
      fetchCountries()
        .then(setCountries)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load countries"))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return { countries, loading, error };
}

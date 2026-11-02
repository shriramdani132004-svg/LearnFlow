'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '@/lib/api';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setData: (updater: T | ((current: T | null) => T | null)) => void;
}

export function useApiQuery<T>(
  path: string | null,
  query?: Record<string, string | number | boolean | undefined | null>,
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<T>(path, query)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, tick]);

  const refetch = useCallback(() => setTick((value) => value + 1), []);
  const update = useCallback(
    (updater: T | ((current: T | null) => T | null)) => {
      setData((current) =>
        typeof updater === 'function'
          ? (updater as (value: T | null) => T | null)(current)
          : updater,
      );
    },
    [],
  );

  return { data, loading, error, refetch, setData: update };
}

export function useQueryParam(name: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(name));
  }, [name]);
  return value;
}

import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// One place that owns loading/error/data, so no screen can be left saying "Loading..."
// after a failed request - the flag is cleared in `finally`, never on the happy path.
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(
    async (signal) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await api.get(path);
        if (!signal?.aborted) setState({ data, loading: false, error: null });
      } catch (err) {
        if (!signal?.aborted) setState({ data: null, loading: false, error: err });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, reload: () => load() };
}

import { useCallback, useState } from "react";

/**
 * Options for useClientFunction hook
 */
export interface UseClientFunctionOptions {
  /** Host function name */
  name: string;
}

/**
 * Result of useClientFunction hook
 */
export interface UseClientFunctionResult<T> {
  /** Function to call the WAM host */
  call: (params: Record<string, unknown>) => Promise<T>;
  /** Whether the function is currently being called */
  loading: boolean;
  /** Error from the last call, if any */
  error: Error | null;
  /** Data from the last successful call */
  data: T | null;
  /** Reset the state */
  reset: () => void;
}

/**
 * Hook for calling a function provided by the WAM host
 */
export function useClientFunction<T = unknown>(
  options: UseClientFunctionOptions
): UseClientFunctionResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const call = useCallback(
    async (params: Record<string, unknown>): Promise<T> => {
      if (typeof window === "undefined") {
        throw new Error("Window is not available");
      }

      const wam = window.ChannelIOWam;
      if (!wam || typeof wam.callClientFunction !== "function") {
        throw new Error("ChannelIOWam.callClientFunction is not available");
      }

      setLoading(true);
      setError(null);

      try {
        const result = await wam.callClientFunction<T>({
          name: options.name,
          params,
        });
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options.name]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { call, loading, error, data, reset };
}

import { useState, useCallback } from "react";
import type { OAuthTargetAuthScope } from "../types/wam.js";

/**
 * Options for useCallFunction hook
 */
export interface UseCallFunctionOptions {
  /** App ID */
  appId: string;
  /** Function name (e.g., "calendar.booking.createBooking") */
  name: string;
  /** OAuth credential ownership to use without changing the authenticated caller */
  targetAuthScope?: OAuthTargetAuthScope;
}

/**
 * Result of useCallFunction hook
 */
export interface UseCallFunctionResult<T> {
  /** Function to call the app function */
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
 * Hook for calling app functions from WAM
 *
 * @param options - Function call options
 * @returns Object with call function and state
 *
 * @example
 * ```typescript
 * function BookingWidget() {
 *   const appId = useWamData('appId');
 *   const { call, loading, error, data } = useCallFunction<{ bookingId: string }>({
 *     appId,
 *     name: 'calendar.booking.createBooking',
 *   });
 *
 *   const handleSubmit = async () => {
 *     const result = await call({
 *       eventTypeId: '123',
 *       startTime: '2024-01-15T10:00:00Z',
 *     });
 *     console.log('Created booking:', result.bookingId);
 *   };
 *
 *   return (
 *     <button onClick={handleSubmit} disabled={loading}>
 *       {loading ? 'Creating...' : 'Create Booking'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCallFunction<T = unknown>(
  options: UseCallFunctionOptions
): UseCallFunctionResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const call = useCallback(
    async (params: Record<string, unknown>): Promise<T> => {
      if (typeof window === "undefined") {
        throw new Error("Window is not available");
      }

      const wam = window.ChannelIOWam;
      if (!wam || typeof wam.callFunction !== "function") {
        throw new Error("ChannelIOWam.callFunction is not available");
      }

      setLoading(true);
      setError(null);

      try {
        const result = await wam.callFunction<T>({
          appId: options.appId,
          name: options.name,
          params,
          ...(options.targetAuthScope && { targetAuthScope: options.targetAuthScope }),
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
    [options.appId, options.name, options.targetAuthScope]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { call, loading, error, data, reset };
}

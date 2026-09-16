/**
 * Size configuration for WAM window
 */
export interface WamSize {
  /** Width in pixels (optional) */
  width?: number;
  /** Height in pixels (required) */
  height: number;
}

/**
 * Arguments for calling an app function
 */
export interface CallFunctionArgs {
  /** App ID */
  appId: string;
  /** Function name (e.g., "calendar.booking.createBooking") */
  name: string;
  /** Function parameters */
  params: Record<string, unknown>;
}

/**
 * Arguments for calling a native function
 */
export interface CallNativeFunctionArgs {
  /** Native function name */
  name: string;
  /** Function parameters */
  params: Record<string, unknown>;
}

/**
 * Arguments for calling a function provided by the WAM host
 */
export interface CallClientFunctionArgs {
  /** Host function name */
  name: string;
  /** Function parameters */
  params: Record<string, unknown>;
}

/**
 * Channel.io WAM API interface
 */
export interface ChannelIOWam {
  /** Get WAM data by key */
  getWamData: (key: string) => unknown;
  /** Set WAM window size */
  setSize: (size: WamSize) => void;
  /** Call an app function */
  callFunction: <T>(args: CallFunctionArgs) => Promise<T>;
  /** Call a native function */
  callNativeFunction: <T>(args: CallNativeFunctionArgs) => Promise<T>;
  /** Call a function provided by the WAM host, when supported */
  callClientFunction?: <T>(args: CallClientFunctionArgs) => Promise<T>;
  /** Close the WAM window */
  close: () => void;
}

/**
 * Extend the global Window interface
 */
declare global {
  interface Window {
    ChannelIOWam?: ChannelIOWam;
  }
}

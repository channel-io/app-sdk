/**
 * Minimal WAM API type for internal use.
 *
 * Matches the ChannelIOWam interface from @channel.io/app-sdk-wam so that
 * the global Window augmentation stays compatible when both packages are
 * installed together.
 */

declare global {
  interface Window {
    ChannelIOWam?: {
      getWamData: (key: string) => unknown;
      setSize: (size: { width?: number; height: number }) => void;
      callFunction: <T>(args: {
        appId: string;
        name: string;
        params: Record<string, unknown>;
        targetAuthScope?: "channel" | "manager";
      }) => Promise<T>;
      callNativeFunction: <T>(args: {
        name: string;
        params: Record<string, unknown>;
      }) => Promise<T>;
      close: () => void;
    };
  }
}

export {};

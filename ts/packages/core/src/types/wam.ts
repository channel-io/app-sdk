export type WamRenderData = Record<string, unknown>;

export interface WamRenderSnapshot<T extends WamRenderData = WamRenderData> {
  schemaVersion: number;
  capturedAt: string;
  data: T;
}

export interface WamSharePolicy {
  channel?: "interactive";
  public?: "fallback" | "interactiveSnapshot";
}

export interface WamPublicFallback {
  title: string;
  description?: string;
  provider?: string;
}

/**
 * Attributes returned by an app Function that opens a WAM.
 *
 * `wamVersion` versions the renderer contract. `renderSnapshot.schemaVersion`
 * versions the persisted data shape consumed by that renderer.
 */
export interface WamResultAttributes<
  TArgs extends WamRenderData = WamRenderData,
  TSnapshot extends WamRenderData = WamRenderData,
> {
  appId?: string;
  name: string;
  wamVersion: number;
  wamArgs?: TArgs;
  renderSnapshot?: WamRenderSnapshot<TSnapshot>;
  title?: string;
  preferredHeight?: number;
  sharePolicy?: WamSharePolicy;
  publicFallback?: WamPublicFallback;
}

export interface WamResult<
  TArgs extends WamRenderData = WamRenderData,
  TSnapshot extends WamRenderData = WamRenderData,
> {
  type: "wam";
  attributes: WamResultAttributes<TArgs, TSnapshot>;
}

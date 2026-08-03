import { useMemo } from "react";
import type { WamRenderData, WamRenderSnapshot } from "@channel.io/app-sdk-core";
import { useWamData } from "./useWamData.js";

export interface ResolvedRenderSnapshot<T extends WamRenderData = WamRenderData> {
  wamVersion: number;
  snapshot:
    WamRenderSnapshot<T> | (Omit<WamRenderSnapshot<T>, "capturedAt"> & { capturedAt?: undefined });
  source: "versioned" | "legacy";
}

export interface ResolveRenderSnapshotInput {
  wamVersion: unknown;
  renderSnapshot: unknown;
  publicSnapshot?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isCapturedAt(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

export function resolveRenderSnapshot<T extends WamRenderData = WamRenderData>({
  wamVersion,
  renderSnapshot,
  publicSnapshot,
}: ResolveRenderSnapshotInput): ResolvedRenderSnapshot<T> | undefined {
  if (
    isPositiveInteger(wamVersion) &&
    isRecord(renderSnapshot) &&
    isPositiveInteger(renderSnapshot["schemaVersion"]) &&
    isCapturedAt(renderSnapshot["capturedAt"]) &&
    isRecord(renderSnapshot["data"])
  ) {
    return {
      wamVersion,
      snapshot: renderSnapshot as unknown as WamRenderSnapshot<T>,
      source: "versioned",
    };
  }

  if (isRecord(publicSnapshot)) {
    return {
      wamVersion: 1,
      snapshot: {
        schemaVersion: 1,
        data: publicSnapshot as T,
      },
      source: "legacy",
    };
  }

  return undefined;
}

/**
 * Reads a persisted WAM render snapshot. Legacy CoS clips that only provide
 * `publicSnapshot` are exposed as renderer/schema version 1.
 */
export function useRenderSnapshot<T extends WamRenderData = WamRenderData>():
  ResolvedRenderSnapshot<T> | undefined {
  const wamVersion = useWamData("wamVersion");
  const renderSnapshot = useWamData("renderSnapshot");
  const publicSnapshot = useWamData("publicSnapshot");

  return useMemo(
    () =>
      resolveRenderSnapshot<T>({
        wamVersion,
        renderSnapshot,
        publicSnapshot,
      }),
    [publicSnapshot, renderSnapshot, wamVersion]
  );
}

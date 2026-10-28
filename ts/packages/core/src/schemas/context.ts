import { z } from "zod";

/** The platform supplies this signed target to system-invoked OAuth flow hooks. */
export const OAuthFlowContextSchema = z
  .object({
    appId: z.string().min(1),
    channelId: z.string().min(1),
    managerId: z.string().min(1),
    authScope: z.enum(["channel", "manager"]),
    key: z.string().optional(),
    targetManagerId: z.string().optional(),
  })
  .strict();

/** Validates shape only; the receiving server must also authenticate the platform request. */
export const IssueSubscriptionContextSchema = z
  .object({
    subscriptionId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/)
      .refine((value) => value.trim() === value, "Whitespace is not allowed"),
    connectionId: z.string().min(1).regex(/\S/).optional(),
    connectionGeneration: z.number().int().min(1).max(4294967295).optional(),
  })
  .strict()
  .refine(
    (value) => (value.connectionId === undefined) === (value.connectionGeneration === undefined),
    "Connection ID and generation must be supplied together"
  );

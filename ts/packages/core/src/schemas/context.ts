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

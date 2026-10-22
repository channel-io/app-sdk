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

export const AppPersonInvocationContextSchema = z
  .object({
    invocationId: z
      .string()
      .min(1)
      .max(128)
      .refine(
        (value) =>
          value.trim() === value && !["*", "all"].includes(value) && !/[.\r\n\0]/.test(value)
      ),
    accessToken: z.string().regex(/^aph1\.[^.\s]+\.[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/),
  })
  .strict()
  .refine((value) => value.accessToken.split(".")[1] === value.invocationId, {
    message: "Invalid AppPerson invocation binding",
  });

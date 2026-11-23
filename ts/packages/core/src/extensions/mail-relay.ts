import { z } from "zod";
import type {
  MailRelayCommonHeaders as ProtoMailRelayCommonHeaders,
  MailRelayHeader as ProtoMailRelayHeader,
  MailRelayInboundInput as ProtoMailRelayInboundInput,
  MailRelayInboundOutput as ProtoMailRelayInboundOutput,
  MailRelayMail as ProtoMailRelayMail,
  MailRelayReceipt as ProtoMailRelayReceipt,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

const NonEmptyStringSchema = z.string().min(1);

export const MailRelayHeaderSchema = z.object({
  name: NonEmptyStringSchema,
  value: z.string(),
});

export const MailRelayCommonHeadersSchema = z
  .object({
    from: z.array(z.string()).optional(),
    to: z.array(z.string()).optional(),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
    subject: z.string().optional(),
    messageId: z.string().optional(),
    date: z.string().optional(),
  })
  .loose();

export const MailRelayMailSchema = z
  .object({
    source: z.string().optional(),
    destination: z.array(z.string()),
    messageId: z.string().optional(),
    commonHeaders: MailRelayCommonHeadersSchema.default({}),
    headers: z.array(MailRelayHeaderSchema),
  })
  .loose();

export const MailRelayReceiptSchema = z
  .object({
    timestamp: z.string().optional(),
    spamVerdict: z.string().optional(),
    virusVerdict: z.string().optional(),
    spfVerdict: z.string().optional(),
    dkimVerdict: z.string().optional(),
    dmarcVerdict: z.string().optional(),
  })
  .loose();

export const MailRelayInboundInputSchema = z.object({
  slug: NonEmptyStringSchema,
  recipient: NonEmptyStringSchema,
  recipients: z.array(NonEmptyStringSchema).min(1),
  sesMessageId: NonEmptyStringSchema,
  bucketName: NonEmptyStringSchema,
  objectKey: NonEmptyStringSchema,
  mail: MailRelayMailSchema,
  receipt: MailRelayReceiptSchema,
});

export type MailRelayHeader = ProtoBacked<
  z.infer<typeof MailRelayHeaderSchema>,
  ProtoMailRelayHeader
>;
export type MailRelayCommonHeaders = ProtoBacked<
  z.infer<typeof MailRelayCommonHeadersSchema>,
  ProtoMailRelayCommonHeaders
>;
export type MailRelayMail = ProtoBacked<z.infer<typeof MailRelayMailSchema>, ProtoMailRelayMail>;
export type MailRelayReceipt = ProtoBacked<
  z.infer<typeof MailRelayReceiptSchema>,
  ProtoMailRelayReceipt
>;
export type MailRelayInboundInput = ProtoBacked<
  z.infer<typeof MailRelayInboundInputSchema>,
  ProtoMailRelayInboundInput
>;

export const MailRelayInboundStatusSchema = z.enum([
  "accepted",
  "ignored",
  "duplicate",
  "retryableFailure",
  "permanentFailure",
]);

export type MailRelayInboundStatus = ProtoBacked<
  z.infer<typeof MailRelayInboundStatusSchema>,
  ProtoMailRelayInboundOutput["status"]
>;

export const MailRelayInboundOutputSchema = z.object({
  status: MailRelayInboundStatusSchema,
  idempotencyKey: z.string().optional(),
  reason: z.string().optional(),
});

export type MailRelayInboundOutput = ProtoBacked<
  z.infer<typeof MailRelayInboundOutputSchema>,
  ProtoMailRelayInboundOutput
>;

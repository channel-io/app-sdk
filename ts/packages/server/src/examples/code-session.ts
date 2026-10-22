import { z } from "zod";
import {
  CodeSendInputInputSchema,
  CodeGetSessionInputSchema,
  CodeStopSessionInputSchema,
  CodeSessionReceiptSchema,
  CodeSessionSnapshotSchema,
  type CodeSendInputInput,
  type CodeGetSessionInput,
  type CodeStopSessionInput,
  type CodeSessionReceipt,
  type CodeSessionSnapshot,
  type CodeExtensionInterface,
  type Context,
} from "@channel.io/app-sdk-core";
import { Extension, Func, Ctx, Input, InputSchema, OutputSchema } from "../decorators/index.js";

/** Persistence boundary, not an in-memory provider simulator.
 * Implementations authenticate the owner, serialize per session, deduplicate each
 * owner + invocation key (including payload conflicts), and commit input/stop,
 * snapshot, event and outbox atomically before resolving. No provider POST here.
 */
export abstract class CodeSessionStore {
  abstract enqueue(ctx: Context, idempotencyKey: string, input: CodeSendInputInput): Promise<void>;
  abstract find(ctx: Context, sessionKey: string): Promise<CodeSessionSnapshot>;
  abstract requestStop(
    ctx: Context,
    idempotencyKey: string,
    input: CodeStopSessionInput
  ): Promise<void>;
}

const Invocation = z.object({ idempotencyKey: z.string().min(1).max(200).regex(/\S/) });
function invocationKey(ctx: Context): string {
  // A verified platform envelope must supply this field. Never copy it from params,
  // synthesize it per HTTP retry, or trust an unsigned caller's context.
  return Invocation.parse(ctx.invocation).idempotencyKey;
}

/** Reference wiring. Supply a durable CodeSessionStore through NestJS providers.
 * The platform invocation metadata and event ingress need a coordinated rollout.
 */
@Extension("code")
export class CodeSessionExtension implements CodeExtensionInterface {
  constructor(private readonly store: CodeSessionStore) {}

  @Func("session.sendInput")
  @InputSchema(CodeSendInputInputSchema)
  @OutputSchema(CodeSessionReceiptSchema)
  async sendInput(
    @Ctx() ctx: Context,
    @Input() input: CodeSendInputInput
  ): Promise<CodeSessionReceipt> {
    await this.store.enqueue(ctx, invocationKey(ctx), input);
    return { sessionKey: input.sessionKey, accepted: true };
  }

  @Func("session.getSession")
  @InputSchema(CodeGetSessionInputSchema)
  @OutputSchema(CodeSessionSnapshotSchema)
  async getSession(
    @Ctx() ctx: Context,
    @Input() input: CodeGetSessionInput
  ): Promise<CodeSessionSnapshot> {
    const snapshot = await this.store.find(ctx, input.sessionKey);
    if (snapshot.sessionKey !== input.sessionKey)
      throw new Error("Session snapshot identity mismatch");
    return snapshot;
  }

  @Func("session.stopSession")
  @InputSchema(CodeStopSessionInputSchema)
  @OutputSchema(CodeSessionReceiptSchema)
  async stopSession(
    @Ctx() ctx: Context,
    @Input() input: CodeStopSessionInput
  ): Promise<CodeSessionReceipt> {
    await this.store.requestStop(ctx, invocationKey(ctx), input);
    return { sessionKey: input.sessionKey, accepted: true };
  }
}

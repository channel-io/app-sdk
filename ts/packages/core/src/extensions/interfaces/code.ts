import type { Context } from "../../types/context.js";
import type {
  CodeSendInputInput,
  CodeGetSessionInput,
  CodeStopSessionInput,
  CodeSessionReceipt,
  CodeSessionSnapshot,
} from "../code.js";

export interface CodeExtensionInterface {
  sendInput(ctx: Context, input: CodeSendInputInput): Promise<CodeSessionReceipt>;
  getSession(ctx: Context, input: CodeGetSessionInput): Promise<CodeSessionSnapshot>;
  stopSession?(ctx: Context, input: CodeStopSessionInput): Promise<CodeSessionReceipt>;
}

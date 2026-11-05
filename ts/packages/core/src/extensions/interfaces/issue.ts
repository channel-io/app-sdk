import type { Context } from "../../types/context.js";
import type {
  IssueCreateCommentInput,
  IssueCreateCommentOutput,
  IssueGetCreateSchemaInput,
  IssueGetCreateSchemaOutput,
  IssueCreateIssueInput,
  IssueCreateIssueOutput,
  IssueSubscriptionStartInput,
  IssueSubscriptionStartOutput,
  IssueSubscriptionStopInput,
  IssueSubscriptionStopOutput,
  IssueSearchIssuesInput,
  IssueSearchIssuesOutput,
  IssueGetIssueInput,
  IssueGetIssueOutput,
  IssueGetIssuesInput,
  IssueGetIssuesOutput,
  IssueGetIssueTransitionsInput,
  IssueGetIssueTransitionsOutput,
  IssueExecuteIssueTransitionInput,
  IssueExecuteIssueTransitionOutput,
} from "../issue.js";

export interface IssueExtensionInterface {
  searchIssues(ctx: Context, input: IssueSearchIssuesInput): Promise<IssueSearchIssuesOutput>;
  getIssue(ctx: Context, input: IssueGetIssueInput): Promise<IssueGetIssueOutput>;
  getIssues(ctx: Context, input: IssueGetIssuesInput): Promise<IssueGetIssuesOutput>;
  getIssueTransitions(
    ctx: Context,
    input: IssueGetIssueTransitionsInput
  ): Promise<IssueGetIssueTransitionsOutput>;
  executeIssueTransition(
    ctx: Context,
    input: IssueExecuteIssueTransitionInput
  ): Promise<IssueExecuteIssueTransitionOutput>;
}

/** Optional group, implemented in addition to IssueExtensionInterface. */
export interface IssueSubscriptionExtensionInterface {
  start(ctx: Context, input: IssueSubscriptionStartInput): Promise<IssueSubscriptionStartOutput>;
  stop(ctx: Context, input: IssueSubscriptionStopInput): Promise<IssueSubscriptionStopOutput>;
}

/** Optional group, implemented in addition to IssueExtensionInterface. */
export interface IssueCreateExtensionInterface {
  getCreateSchema(
    ctx: Context,
    input: IssueGetCreateSchemaInput
  ): Promise<IssueGetCreateSchemaOutput>;
  createIssue(ctx: Context, input: IssueCreateIssueInput): Promise<IssueCreateIssueOutput>;
}

/** Optional function, implemented independently of the creation group. */
export interface IssueCommentExtensionInterface {
  createComment(ctx: Context, input: IssueCreateCommentInput): Promise<IssueCreateCommentOutput>;
}

import type { Context } from "../../types/context.js";
import type {
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

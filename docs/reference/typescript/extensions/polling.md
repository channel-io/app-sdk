# Polling Extension

Use polling when AppStore should schedule repeated channel- or manager-scoped app functions. AppStore owns scheduling and queueing; the app owns target discovery and poller logic.

Required functions:

- `extension.polling.metadata.getPollers`
- `extension.polling.target.getChannels` for channel-scoped pollers
- `extension.polling.target.getManagers` for manager-scoped pollers

```ts
import { z } from "zod";
import {
  Context,
  Ctx,
  Extension,
  Func,
  GetPollersOutputSchema,
  GetPollingTargetChannelsInputSchema,
  GetPollingTargetChannelsOutputSchema,
  GetPollingTargetManagersInputSchema,
  GetPollingTargetManagersOutputSchema,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

@Extension({ name: "polling", systemVersion: "v1" })
export class PollingExtension {
  @Func("metadata.getPollers")
  @InputSchema(z.object({}))
  @OutputSchema(GetPollersOutputSchema)
  getPollers() {
    return {
      pollers: [
        {
          functionName: "extension.polling.poller.pollQnAs",
          intervalSeconds: 900,
          timeoutSeconds: 30,
          maxConcurrency: 5,
          rps: 1,
          executionScope: "channel",
        },
        {
          functionName: "extension.polling.poller.pollCalendars",
          intervalSeconds: 3600,
          executionScope: "manager",
        },
      ],
    };
  }

  @Func("target.getManagers")
  @InputSchema(GetPollingTargetManagersInputSchema)
  @OutputSchema(GetPollingTargetManagersOutputSchema)
  async getManagers(
    @Input() input: z.infer<typeof GetPollingTargetManagersInputSchema>,
  ) {
    return listConnectedManagers(input);
  }

  @Func("target.getChannels")
  @InputSchema(GetPollingTargetChannelsInputSchema)
  @OutputSchema(GetPollingTargetChannelsOutputSchema)
  async getChannels(
    @Input() input: z.infer<typeof GetPollingTargetChannelsInputSchema>,
  ) {
    return listBoardEnabledChannels(input);
  }

  @Func("poller.pollQnAs")
  @InputSchema(z.object({}))
  @OutputSchema(z.object({}))
  async pollQnAs(@Ctx() ctx: Context) {
    await pollExternalBoard(ctx.channel.id);
    return {};
  }

  @Func("poller.pollCalendars")
  @InputSchema(z.object({}))
  @OutputSchema(z.object({}))
  async pollCalendars(@Ctx() ctx: Context) {
    await pollProviderCalendar(ctx.channel.id, ctx.caller.id);
    return {};
  }
}
```

## Poller fields

| Field             | Required | Description                                   |
| ----------------- | -------- | --------------------------------------------- |
| `functionName`    | Yes      | Full function name called with scoped context |
| `intervalSeconds` | Yes      | Run creation interval                         |
| `timeoutSeconds`  | No       | Per-call timeout; default `30`                |
| `maxConcurrency`  | No       | Per-worker in-flight limit; default `5`       |
| `rps`             | No       | Per-worker rate limit; default `1`            |
| `executionScope`  | No       | `channel` (default) or `manager`              |

Both target resolvers receive `functionName`, optional `cursor`, and `limit` (maximum 500). `getChannels` returns `channelIds`; `getManagers` returns `targets` containing `{ channelId, managerId }`. Each manager target counts toward `limit`, so the app pages targets directly instead of asking AppStore to fan out channel credentials. If `hasNextPage` is true, `nextCursor` is required.

Manager-scoped pollers run with the target manager as caller. The existing AppStore function-call path uses that caller to hydrate manager OAuth, API key, and manager config; polling itself is not coupled to OAuth.

Enable `autoRegister` for the decorated class. AppStore reads poller metadata during `registerExtension("polling", "v1")` and requires the resolver for every declared execution scope.

## Cron schedules and schedule identity

`intervalSeconds` and `cronExpression` are mutually exclusive. Cron requires an explicit IANA `timezone` (or `UTC`) and five fields: minute, hour, day of month, month, day of week. Seconds, `@daily` and inline timezone overrides are unsupported. App Store validates cron syntax and rejects impossible dates during registration.

```ts
const pollers = [
  {
    pollerId: "morning",
    functionName: "poll",
    cronExpression: "0 9 * * *",
    timezone: "Asia/Seoul",
  },
  {
    pollerId: "evening",
    functionName: "poll",
    cronExpression: "0 18 * * *",
    timezone: "Asia/Seoul",
  },
];
```

`pollerId` defaults to `functionName`; IDs must be unique within one extension implementation. Distinct IDs can call the same function. Target resolvers still receive `functionName`, and callbacks still receive empty params. Schedule identity does not change the callback contract.

The scheduler creates a due run at its next tick (normally within 30 seconds), then queues targets. This is not an exact-second delivery guarantee. Missed occurrences coalesce to one run, then advance beyond the current time. Nonexistent DST times are skipped; repeated DST times run twice. Apps must enforce business idempotency.

Register cron declarations only after all App Store scheduler/registry/worker resources support them and the polling schema migration has completed. Before rolling back to interval-only binaries, disable cron handlers and drain existing work. Removing an ID cancels pending work; changing its function, scope or schedule replaces the handler to fence queued old work. Already executing calls may finish.

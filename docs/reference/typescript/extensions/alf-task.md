# ALF Task Extension

Use the ALF task extension when your app should publish predefined automation tasks to ALF.

## Required Function

- `extension.alfTask.alftask.getTasks`

The current SDK interface names the function group `alftask` and the function `getTasks`.

## Registration

Use the common `registerExtension("alfTask", "v1")` flow. Successful registration also triggers
task synchronization. Re-register the extension after changing its task definitions.

Use `getAlfTaskVersions(appId, accessToken)` when you need to inspect the registered task versions.

## When To Use It

Choose ALF task when:

- the app publishes reusable automation definitions
- the task version matters independently of the rest of your extension surface
- you want AppStore to pull task metadata from your app server and sync it into ALF

---
"@channel.io/app-sdk-core": minor
"@channel.io/app-sdk-server": minor
---

Remove the extension-specific `registerAlfTasks` and `registerAppNotebooks` SDK APIs. Registering or refreshing ALF Task and Notebook extensions now uses the common `registerExtension` flow.

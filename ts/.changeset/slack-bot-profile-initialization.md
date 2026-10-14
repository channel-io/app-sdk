---
"@channel.io/app-sdk-core": minor
"@channel.io/app-sdk-server": minor
---

Add optional botDisplayName and botAvatarUrl fields to native message DTOs for initializing immutable TeamChat bot profiles through writeGroupMessage. Keep botName as the profile lookup key; existing bots and requests without the new fields retain their behavior.

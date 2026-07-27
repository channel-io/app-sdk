# Calendar Extension

Provider calendar、event type、availability、booking の作成・取消・照会に使います。

## Contract

- `extension.calendar.calendar.listCalendars`
- `extension.calendar.calendar.listEventTypes`
- `extension.calendar.calendar.getAvailability`
- `extension.calendar.booking.createBooking`
- `extension.calendar.booking.cancelBooking`
- `extension.calendar.bookingQuery.getBooking`

Integration が対応する operation を実装し、非対応 operation は成功として扱わず、明確な
unsupported error を返します。

Availability には event type、start/end range、optional time zone が必要です。Booking 作成は
event type、start time、attendee、optional note/time zone を使い、cancel/lookup は stable booking
ID を使います。Calendar list は page で返し、provider ID を翻訳せず保持します。

## TypeScript

`@Extension({ name: "calendar", systemVersion: "v1" })` と公開
`CalendarExtensionInterface` を使います。この release はすべての Calendar method に named
Function-level Zod schema を export していないため、full Function name を
[canonical schema registry pattern](../../../reference/typescript/EXTENSIONS.md#canonical-schema-registry)
で解決します。Provider の説明は [TypeScript Calendar reference](../../../reference/typescript/extensions/calendar.md)
を参照してください。

## Go

```go
err := app.Use(calendar.Extension().
  ListCalendars(handler.ListCalendars).
  ListEventTypes(handler.ListEventTypes).
  GetAvailability(handler.GetAvailability).
  CreateBooking(handler.CreateBooking).
  CancelBooking(handler.CancelBooking).
  GetBooking(handler.GetBooking))
```

## 認証・WAM・信頼性

- Provider credential は server に置き、すべての時刻を明示的な time zone で正規化します。
- WAM は `useCallFunction` で slot を選び、provider booking call は server が行います。
- Booking 作成を idempotent、取消を安全に再実行可能にします。Commit 直前に availability を
  再確認します。
- DST change、expired slot、duplicate request、provider timeout、cancellation race、permission
  denial を test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。

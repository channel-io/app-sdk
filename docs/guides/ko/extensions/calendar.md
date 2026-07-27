# Calendar Extension

Provider calendar, event type, availability, booking 생성·취소, booking 조회에 사용합니다.

## 계약

- `extension.calendar.calendar.listCalendars`
- `extension.calendar.calendar.listEventTypes`
- `extension.calendar.calendar.getAvailability`
- `extension.calendar.booking.createBooking`
- `extension.calendar.booking.cancelBooking`
- `extension.calendar.bookingQuery.getBooking`

Integration이 지원하는 operation을 구현하고, 지원하지 않는 operation은 성공으로 위장하지 말고
명시적인 unsupported error를 반환합니다.

Availability에는 event type, start/end range, optional timezone이 필요합니다. Booking 생성은 event
type, start time, attendee, optional note/timezone을 사용하고 취소와 조회는 stable booking ID를
사용합니다. Calendar 목록은 pagination하고 provider ID를 번역하지 않고 보존합니다.

## TypeScript

`@Extension({ name: "calendar", systemVersion: "v1" })`과 공개
`CalendarExtensionInterface`를 사용합니다. 현재 release는 모든 Calendar method의 이름 있는
Function-level Zod schema를 export하지 않으므로 전체 Function 이름을
[canonical schema registry pattern](../../../reference/typescript/EXTENSIONS.md#canonical-schema-registry)으로
해결합니다. Provider 설명은 [TypeScript Calendar 레퍼런스](../../../reference/typescript/extensions/calendar.md)를
확인하세요.

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

## 인증·WAM·신뢰성

- Provider credential은 server에 두고 모든 시간을 명시적인 timezone으로 정규화합니다.
- WAM은 `useCallFunction`으로 slot을 선택하고 provider booking 호출은 server가 수행합니다.
- Booking 생성은 idempotent하게, 취소는 안전하게 반복 가능하게 만듭니다. Commit 직전에 availability를
  다시 확인합니다.
- DST 전환, 만료 slot, duplicate request, provider timeout, cancellation race, permission denial을
  테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.

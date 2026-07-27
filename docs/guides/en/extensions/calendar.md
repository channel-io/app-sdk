# Calendar Extension

Use Calendar for provider calendars, event types, availability, booking creation/cancellation, and
booking lookup.

## Contract

- `extension.calendar.calendar.listCalendars`
- `extension.calendar.calendar.listEventTypes`
- `extension.calendar.calendar.getAvailability`
- `extension.calendar.booking.createBooking`
- `extension.calendar.booking.cancelBooking`
- `extension.calendar.bookingQuery.getBooking`

Implement the operations supported by the integration and return explicit unsupported errors for
the rest instead of silently succeeding.

Availability requires an event type, start/end range, and optional time zone. Booking creation uses
an event type, start time, attendee, optional notes, and optional time zone; cancellation and lookup
use the stable booking ID. Page calendar lists and preserve provider IDs without translating them.

## TypeScript

Use `@Extension({ name: "calendar", systemVersion: "v1" })` and the exported
`CalendarExtensionInterface`. Resolve each full Function name through the
[canonical schema registry pattern](../../../reference/typescript/EXTENSIONS.md#canonical-schema-registry)
because this release does not export a named Function-level Zod schema for every Calendar method.
Provider guidance is in the [TypeScript Calendar reference](../../../reference/typescript/extensions/calendar.md).

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

## Authentication, WAM, and reliability

- Keep provider credentials server-side and normalize all timestamps with an explicit time zone.
- A WAM may select a slot with `useCallFunction`; booking provider calls remain on the server.
- Make booking creation idempotent and cancellation safely repeatable. Recheck availability before
  committing a booking.
- Test daylight-saving changes, expired slots, duplicate requests, provider timeouts, cancellation
  races, and permission denial.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).

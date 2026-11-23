/* eslint-disable @typescript-eslint/require-await */
import {
  Extension,
  Func,
  Ctx,
  Input,
  InputSchema,
  OutputSchema,
  Description,
} from "@channel.io/app-sdk-server";
import { z } from "zod";
import type { Context } from "@channel.io/app-sdk-core";
import type { EventType, TimeSlot, Booking } from "@calendar-example/shared";

// Zod Schemas
const EventTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.number(),
  description: z.string().optional(),
});

const TimeSlotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

const AttendeeSchema = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string().optional(),
});

const BookingSchema = z.object({
  id: z.string(),
  eventTypeId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  attendee: AttendeeSchema,
  status: z.enum(["confirmed", "cancelled", "pending"]),
  notes: z.string().optional(),
});

// Input schemas
const ListEventTypesInput = z.object({
  calendarId: z.string().optional(),
});

const GetAvailabilityInput = z.object({
  eventTypeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string().optional(),
});

const CreateBookingInput = z.object({
  eventTypeId: z.string(),
  startTime: z.string(),
  attendee: AttendeeSchema,
  notes: z.string().optional(),
});

const CancelBookingInput = z.object({
  bookingId: z.string(),
  reason: z.string().optional(),
});

const GetBookingsInput = z.object({
  status: z.enum(["confirmed", "cancelled", "pending"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().optional(),
});

const GetBookingDetailsInput = z.object({
  bookingId: z.string(),
});

// Mock data store
const mockEventTypes: EventType[] = [
  {
    id: "et-1",
    name: "15 Minute Meeting",
    duration: 15,
    description: "Quick sync or introduction call",
  },
  {
    id: "et-2",
    name: "30 Minute Meeting",
    duration: 30,
    description: "Standard meeting for discussions",
  },
  {
    id: "et-3",
    name: "60 Minute Consultation",
    duration: 60,
    description: "In-depth consultation or demo",
  },
];

const mockBookings = new Map<string, Booking>();

/**
 * Calendar extension for booking functionality
 */
@Extension({ name: "calendar", systemVersion: "v1" })
export class CalendarExtension {
  /**
   * List available event types
   */
  @Func("calendar.listEventTypes")
  @Description("List all available event types for booking")
  @InputSchema(ListEventTypesInput)
  @OutputSchema(z.object({ eventTypes: z.array(EventTypeSchema) }))
  async listEventTypes(
    @Ctx() _ctx: Context,
    @Input() _params: z.infer<typeof ListEventTypesInput>
  ) {
    return { eventTypes: mockEventTypes };
  }

  /**
   * Get available time slots
   */
  @Func("calendar.getAvailability")
  @Description("Get available time slots for a specific event type")
  @InputSchema(GetAvailabilityInput)
  @OutputSchema(z.object({ slots: z.array(TimeSlotSchema) }))
  async getAvailability(
    @Ctx() _ctx: Context,
    @Input() params: z.infer<typeof GetAvailabilityInput>
  ) {
    const eventType = mockEventTypes.find((et) => et.id === params.eventTypeId);
    if (!eventType) {
      return { slots: [] };
    }

    // Generate mock available slots for the date range
    const slots: TimeSlot[] = [];
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      // Generate slots from 9 AM to 5 PM
      for (let hour = 9; hour < 17; hour++) {
        const startTime = new Date(d);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + eventType.duration);

        // Only add if end time is before 5 PM
        if (endTime.getHours() <= 17) {
          slots.push({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });
        }
      }
    }

    return { slots };
  }

  /**
   * Create a new booking
   */
  @Func("booking.createBooking")
  @Description("Create a new booking")
  @InputSchema(CreateBookingInput)
  @OutputSchema(z.object({ booking: BookingSchema }))
  async createBooking(@Ctx() ctx: Context, @Input() params: z.infer<typeof CreateBookingInput>) {
    const eventType = mockEventTypes.find((et) => et.id === params.eventTypeId);
    if (!eventType) {
      throw new Error(`Event type not found: ${params.eventTypeId}`);
    }

    const startTime = new Date(params.startTime);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + eventType.duration);

    const booking: Booking = {
      id: `booking-${Date.now()}`,
      eventTypeId: params.eventTypeId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendee: params.attendee,
      status: "confirmed",
    };

    if (params.notes) {
      booking.notes = params.notes;
    }

    mockBookings.set(booking.id, booking);

    console.log(`[Calendar] Booking created for channel ${ctx.channel.id}:`, booking.id);

    return { booking };
  }

  /**
   * Cancel an existing booking
   */
  @Func("booking.cancelBooking")
  @Description("Cancel an existing booking")
  @InputSchema(CancelBookingInput)
  @OutputSchema(z.object({ success: z.boolean(), booking: BookingSchema.optional() }))
  async cancelBooking(@Ctx() ctx: Context, @Input() params: z.infer<typeof CancelBookingInput>) {
    const booking = mockBookings.get(params.bookingId);

    if (!booking) {
      return { success: false };
    }

    booking.status = "cancelled";
    mockBookings.set(params.bookingId, booking);

    console.log(`[Calendar] Booking cancelled for channel ${ctx.channel.id}:`, params.bookingId);

    return { success: true, booking };
  }

  /**
   * Get bookings with optional filters
   */
  @Func("bookingQuery.getBookings")
  @Description("Get list of bookings")
  @InputSchema(GetBookingsInput)
  @OutputSchema(z.object({ bookings: z.array(BookingSchema) }))
  async getBookings(@Ctx() _ctx: Context, @Input() params: z.infer<typeof GetBookingsInput>) {
    let bookings = Array.from(mockBookings.values());

    if (params.status) {
      bookings = bookings.filter((b) => b.status === params.status);
    }

    if (params.startDate) {
      const startDate = params.startDate;
      bookings = bookings.filter((b) => new Date(b.startTime) >= new Date(startDate));
    }

    if (params.endDate) {
      const endDate = params.endDate;
      bookings = bookings.filter((b) => new Date(b.startTime) <= new Date(endDate));
    }

    if (params.limit) {
      bookings = bookings.slice(0, params.limit);
    }

    return { bookings };
  }

  /**
   * Get booking details by ID
   */
  @Func("bookingQuery.getBookingDetails")
  @Description("Get details of a specific booking")
  @InputSchema(GetBookingDetailsInput)
  @OutputSchema(z.object({ booking: BookingSchema.nullable() }))
  async getBookingDetails(
    @Ctx() _ctx: Context,
    @Input() params: z.infer<typeof GetBookingDetailsInput>
  ) {
    const booking = mockBookings.get(params.bookingId);
    return { booking: booking ?? null };
  }
}

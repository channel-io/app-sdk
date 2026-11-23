import { z } from "zod";
import type {
  Calendar as ProtoCalendar,
  CalendarAttendee as ProtoAttendee,
  CalendarBooking as ProtoBooking,
  CalendarEventType as ProtoEventType,
  CalendarTimeSlot as ProtoTimeSlot,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

/**
 * Calendar schema
 */
export const CalendarSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export type Calendar = ProtoBacked<z.infer<typeof CalendarSchema>, ProtoCalendar>;

/**
 * Event type schema
 */
export const EventTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration: z.number(),
  description: z.string().optional(),
  color: z.string().optional(),
});

export type EventType = ProtoBacked<z.infer<typeof EventTypeSchema>, ProtoEventType>;

/**
 * Time slot schema
 */
export const TimeSlotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

export type TimeSlot = ProtoBacked<z.infer<typeof TimeSlotSchema>, ProtoTimeSlot>;

/**
 * Attendee schema
 */
export const AttendeeSchema = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string().optional(),
});

export type Attendee = ProtoBacked<z.infer<typeof AttendeeSchema>, ProtoAttendee>;

/**
 * Booking status
 */
export const BookingStatus = z.enum(["confirmed", "cancelled", "pending"]);
export type BookingStatus = z.infer<typeof BookingStatus>;

/**
 * Booking schema
 */
export const BookingSchema = z.object({
  id: z.string(),
  eventTypeId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  attendee: AttendeeSchema,
  status: BookingStatus,
  notes: z.string().optional(),
  meetingUrl: z.string().optional(),
  calendarEventId: z.string().optional(),
});

export type Booking = ProtoBacked<z.infer<typeof BookingSchema>, ProtoBooking>;

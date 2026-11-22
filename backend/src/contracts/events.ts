import { z } from 'zod'
export const uuid = z.string().uuid()
export const email = z.string().trim().toLowerCase().email().max(254)
export const categories = ['Hackathon', 'Workshop', 'Talk', 'Social'] as const
export const eventInput = z
  .object({
    title: z.string().trim().min(2).max(90),
    category: z.enum(categories),
    description: z.string().trim().min(10).max(4000),
    venue: z.string().trim().min(2).max(120),
    venue_latitude: z.number().min(-90).max(90).nullable().optional(),
    venue_longitude: z.number().min(-180).max(180).nullable().optional(),
    capacity: z.number().int().min(1).max(10000),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    state: z.enum(['draft', 'published', 'cancelled', 'archived']),
  })
  .strict()
  .refine(
    (x) =>
      (x.venue_latitude == null && x.venue_longitude == null) ||
      (x.venue_latitude != null && x.venue_longitude != null),
    { path: ['venue_latitude'], message: 'Choose both map coordinates or leave both blank.' },
  )
  .refine((x) => Date.parse(x.starts_at) < Date.parse(x.ends_at), {
    message: 'End time must follow the start time.',
  })
export const eventEdit = eventInput.safeExtend({ revision: z.number().int().positive() })
export const attendeeDetails = z
  .object({
    university: z.string().trim().min(2).max(160),
    academic_level: z.enum(['Bachelor', 'Master', 'Other']),
    subject: z.string().trim().min(2).max(120),
    study_period: z.string().trim().min(1).max(48),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .regex(/^\+?[0-9][0-9\s().-]{5,28}$/),
  })
  .strict()
export const admission = z
  .object({
    name: z.string().trim().normalize().min(2).max(100),
    profile: attendeeDetails.optional(),
    waitlist: z.boolean(),
    consent: z.literal(true),
    listed: z.boolean().default(false),
    companion: z.boolean().default(false),
    website: z.literal('').optional(),
    answers: z.record(uuid, z.string().trim().max(600)).default({}),
    request_key: uuid.optional(),
  })
  .strict()

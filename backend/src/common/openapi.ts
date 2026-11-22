import { codeRequest, verification, credentials, signOut } from '../auth/auth.service'
import { archiveRequest, coverUpload, settings } from '../committee/controls.service'
import { rosterAction } from '../committee/roster.service'
import { appointment, roleChange } from '../audit/audit.service'
import { cancelLink, erasure } from '../passes/passes.service'
import { review } from '../feedback/feedback.service'
import { checkIn } from '../checkin/checkin.service'
import { announcement } from '../announcements/announcements.service'
import { z } from 'zod'
import type {
  OpenAPIObject,
  SchemaObject,
  OperationObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import { eventInput, eventEdit, admission } from '../contracts/events'
import { programme } from '../agenda/programme.service'
const bodies: Record<string, z.ZodType> = {
  AuthController_challenge: codeRequest,
  AuthController_verify: verification,
  AuthController_login: credentials,
  AuthController_logout: signOut,
  ControlsController_archive: archiveRequest,
  ControlsController_upload: coverUpload,
  RosterController_bulk: rosterAction,
  AuditController_appoint: appointment,
  AuditController_role: roleChange,
  PassesController_erase: erasure,
  PassesController_previewCancellation: cancelLink,
  PassesController_cancelByLink: cancelLink,
  FeedbackController_send: review,
  CheckinController_check: checkIn,
  AnnouncementsController_send: announcement,
  EventsController_create: eventInput,
  EventsController_edit: eventEdit,
  RegistrationsController_register: admission,
  ControlsController_save: settings,
  AgendaController_save: programme,
}
export function describeApi(doc: OpenAPIObject) {
  doc.openapi = '3.1.0'
  for (const [route, methods] of Object.entries(doc.paths)) {
    for (const [verb, op] of Object.entries(methods) as [string, OperationObject][]) {
      const schema = bodies[op.operationId || '']
      if (schema) {
        const json = z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' })
        delete json.$schema
        op.requestBody = {
          required: true,
          content: { 'application/json': { schema: json as SchemaObject } },
        }
      }
      const committee =
        route.includes('/committee/') ||
        route.includes('/check-in/') ||
        route.endsWith('/auth/staff')
      const bearerCancel = route.includes('/passes/cancel-link')
      const guest =
        (!bearerCancel && route.includes('/passes')) ||
        route.endsWith('/register') ||
        route.endsWith('/cancel-pass') ||
        route.endsWith('/auth/me') ||
        route.endsWith('/auth/profile')
      if (committee || guest) op.security = [committee ? { committee: [] } : { guest: [] }]
      op.description = bearerCancel
        ? 'Uses a signed cancellation link sent to the attendee email address.'
        : committee
          ? route.endsWith('/check-in') || route.includes('/check-in/') || route.endsWith('/staff')
            ? 'Committee access, including door volunteers.'
            : /\/(team|audit|mail)(\/|$)/.test(route)
              ? 'Administrators only.'
              : 'Organizers and administrators.'
          : guest
            ? 'Requires a verified student email.'
            : 'Public endpoint.'
      if (verb !== 'get') op.description += ' Send the site origin in the Origin header.'
      op.responses.default = {
        description: 'Request error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'message', 'details', 'requestId'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: {} },
                requestId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      }
    }
  }
  return doc
}

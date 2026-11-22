'use client'
import type { SocietyEvent } from '@/lib/events'
export type StudentDetails = {
  university: string
  academic_level: 'Bachelor' | 'Master' | 'Other'
  subject: string
  study_period: string
  phone: string
}
export const emptyStudentDetails: StudentDetails = {
  university: '',
  academic_level: 'Bachelor',
  subject: '',
  study_period: '',
  phone: '',
}
export function StudentDetailsFields({
  value,
  onChange,
}: {
  value: StudentDetails
  onChange: (value: StudentDetails) => void
}) {
  const set = (key: keyof StudentDetails, next: string) => onChange({ ...value, [key]: next })
  return (
    <fieldset className="student-details">
      <legend>Your details · saved for next time</legend>
      <label>
        University
        <input
          required
          minLength={2}
          maxLength={160}
          autoComplete="organization"
          value={value.university}
          onChange={(e) => set('university', e.target.value)}
        />
      </label>
      <div className="form-row">
        <label>
          Study level
          <select
            value={value.academic_level}
            onChange={(e) => set('academic_level', e.target.value)}
          >
            <option value="Bachelor">Bachelor’s</option>
            <option value="Master">Master’s</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Subject or degree
          <input
            required
            minLength={2}
            maxLength={120}
            autoComplete="off"
            value={value.subject}
            onChange={(e) => set('subject', e.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Semester or class
          <input
            required
            maxLength={48}
            placeholder="e.g. Semester 4"
            value={value.study_period}
            onChange={(e) => set('study_period', e.target.value)}
          />
        </label>
        <label>
          Phone number
          <input
            required
            type="tel"
            minLength={7}
            maxLength={30}
            autoComplete="tel"
            value={value.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </label>
      </div>
      <p className="profile-note">We’ll fill these in after you verify this email next time.</p>
    </fieldset>
  )
}

export function RegistrationFields({ event: e }: { event: SocietyEvent }) {
  return (
    <>
      <label className="trap" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {e.questions?.map((q) => (
        <label key={q.id}>
          {q.label}
          {q.required ? ' *' : ''}
          {q.options.length ? (
            <select name={q.id} defaultValue="" required={q.required}>
              <option value="">Choose an answer</option>
              {q.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input name={q.id} required={q.required} maxLength={600} />
          )}
        </label>
      ))}
      {e.plus_one && (
        <label className="check-label">
          <input type="checkbox" name="companion" />
          Reserve a second seat for a guest
        </label>
      )}
      <label className="check-label">
        <input type="checkbox" name="listed" />
        Show my initial on the invitation
      </label>
      <label className="check-label">
        <input type="checkbox" required name="consent" />I agree to the society using these details
        for registration and event updates.
      </label>
    </>
  )
}

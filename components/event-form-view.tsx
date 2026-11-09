'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, LoaderCircle, Save, X } from 'lucide-react'
import { EVENT_CATEGORIES, type EventRecord } from '@/lib/event-store'

type EventFormViewProps = {
  event: EventRecord | null
  onSaved: (event: EventRecord, created: boolean) => void
  onCancel: () => void
  notify: (message: string) => void
}

type FormValues = {
  eventName: string
  description: string
  category: string
  hostName: string
  eventDate: string
  eventTime: string
  venue: string
  location: string
  contactInfo: string
  expectedAttendees: string
  coverImage: string
}

function blankForm(): FormValues {
  return {
    eventName: '',
    description: '',
    category: 'kitchen_party',
    hostName: '',
    eventDate: new Date().toISOString().slice(0, 10),
    eventTime: '14:00',
    venue: '',
    location: '',
    contactInfo: '',
    expectedAttendees: '0',
    coverImage: '',
  }
}

function fromEvent(event: EventRecord): FormValues {
  return {
    eventName: event.eventName,
    description: event.description,
    category: event.category,
    hostName: event.hostName,
    eventDate: event.eventDate,
    eventTime: event.eventTime.slice(0, 5) || '14:00',
    venue: event.venue,
    location: event.location,
    contactInfo: event.contactInfo,
    expectedAttendees: String(event.expectedAttendees ?? 0),
    coverImage: event.coverImage ?? '',
  }
}

async function compressPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this photo.')))
    reader.onerror = () => reject(new Error('Could not read this photo.'))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Photo editing is not available in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.78)
}

export function EventFormView({ event, onSaved, onCancel, notify }: EventFormViewProps) {
  const [values, setValues] = useState<FormValues>(() => (event ? fromEvent(event) : blankForm()))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isReadingPhoto, setIsReadingPhoto] = useState(false)

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const handlePhoto = async (inputEvent: ChangeEvent<HTMLInputElement>) => {
    const file = inputEvent.target.files?.[0]
    inputEvent.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the cover photo.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Choose a photo smaller than 15 MB.')
      return
    }
    setIsReadingPhoto(true)
    try {
      update('coverImage', await compressPhoto(file))
    } catch {
      setError('This photo could not be added. You can still create the event without it.')
    } finally {
      setIsReadingPhoto(false)
    }
  }

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const expectedAttendees = Number(values.expectedAttendees || 0)

    if (values.eventName.trim().length < 2) return setError('Add the event name.')
    if (values.hostName.trim().length < 2) return setError('Add the host name.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.eventDate)) return setError('Choose a valid event date.')
    if (!values.eventTime) return setError('Add the event time.')
    if (values.venue.trim().length < 2) return setError('Add the venue.')
    if (values.location.trim().length < 2) return setError('Add the location.')
    if (values.contactInfo.trim().length < 3) return setError('Add contact information.')
    if (!Number.isInteger(expectedAttendees) || expectedAttendees < 0) return setError('Expected attendees must be a whole number.')

    setIsSaving(true)
    try {
      const response = await fetch(event ? `/api/events/${event.id}` : '/api/events', {
        method: event ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: values.eventName.trim(),
          description: values.description.trim(),
          category: values.category,
          hostName: values.hostName.trim(),
          eventDate: values.eventDate,
          eventTime: values.eventTime,
          venue: values.venue.trim(),
          location: values.location.trim(),
          contactInfo: values.contactInfo.trim(),
          expectedAttendees,
          coverImage: values.coverImage || null,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : 'Could not save this event.'
        setError(message)
        notify(message)
        return
      }
      const saved = data.event as EventRecord
      notify(event ? 'Event updated.' : 'Event created.')
      onSaved(saved, !event)
    } catch {
      const message = 'Could not save this event. Is the database running?'
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="dashboard-page" aria-labelledby="event-form-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">{event ? 'UPDATE YOUR CELEBRATION' : 'LIST A NEW CELEBRATION'}</p>
          <h1 id="event-form-heading">{event ? 'Edit event' : 'Create event'}</h1>
          <p className="page-intro">Contributors will discover this event once it is open.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onCancel}>
          <X aria-hidden="true" />
          Cancel
        </button>
      </div>

      <div className="list-panel">
        <form className="contribution-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>
              Event name <span className="required-mark">*</span>
            </span>
            <input
              value={values.eventName}
              onChange={(inputEvent) => update('eventName', inputEvent.target.value)}
              placeholder="e.g. Chanda &amp; Mwamba Kitchen Party"
              maxLength={160}
              required
            />
          </label>

          <label className="form-field">
            <span>
              Description <span className="optional-label">Optional</span>
            </span>
            <textarea
              value={values.description}
              onChange={(inputEvent) => update('description', inputEvent.target.value)}
              placeholder="A short note about the celebration…"
              rows={3}
              maxLength={1000}
            />
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Category</span>
              <select
                className="form-select"
                value={values.category}
                onChange={(inputEvent) => update('category', inputEvent.target.value)}
              >
                {EVENT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>
                Host name <span className="required-mark">*</span>
              </span>
              <input
                value={values.hostName}
                onChange={(inputEvent) => update('hostName', inputEvent.target.value)}
                placeholder="e.g. Chanda Phiri"
                maxLength={120}
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                Event date <span className="required-mark">*</span>
              </span>
              <input
                type="date"
                value={values.eventDate}
                onChange={(inputEvent) => update('eventDate', inputEvent.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>
                Start time <span className="required-mark">*</span>
              </span>
              <input
                type="time"
                value={values.eventTime}
                onChange={(inputEvent) => update('eventTime', inputEvent.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                Venue <span className="required-mark">*</span>
              </span>
              <input
                value={values.venue}
                onChange={(inputEvent) => update('venue', inputEvent.target.value)}
                placeholder="e.g. Mulungushi Village Hall"
                maxLength={160}
                required
              />
            </label>
            <label className="form-field">
              <span>
                Location <span className="required-mark">*</span>
              </span>
              <input
                value={values.location}
                onChange={(inputEvent) => update('location', inputEvent.target.value)}
                placeholder="e.g. Lusaka, Zambia"
                maxLength={255}
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                Contact info <span className="required-mark">*</span>
              </span>
              <input
                value={values.contactInfo}
                onChange={(inputEvent) => update('contactInfo', inputEvent.target.value)}
                placeholder="e.g. 097 123 4567"
                maxLength={120}
                required
              />
            </label>
            <label className="form-field">
              <span>Expected attendees</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={values.expectedAttendees}
                onChange={(inputEvent) => update('expectedAttendees', inputEvent.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <div className="form-field photo-field">
            <span>
              Cover photo <span className="optional-label">Optional</span>
            </span>
            {values.coverImage ? (
              <div className="photo-preview-row">
                <img src={values.coverImage} alt="Preview of the event cover" />
                <div>
                  <strong>Cover photo attached</strong>
                  <small>Shown to contributors browsing events</small>
                </div>
                <button className="text-button" type="button" onClick={() => update('coverImage', '')}>
                  Remove
                </button>
              </div>
            ) : (
              <label className="photo-picker">
                <span className="photo-picker-icon">
                  <Camera aria-hidden="true" />
                </span>
                <span>
                  <strong>{isReadingPhoto ? 'Adding photo…' : 'Add a cover photo'}</strong>
                  <small>Tap to take or choose a photo of the celebration</small>
                </span>
                {isReadingPhoto ? <LoaderCircle className="photo-spinner" aria-label="Loading photo" /> : <Camera aria-hidden="true" />}
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Add an event cover photo" />
              </label>
            )}
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-footer">
            <p>Saved to the event registry</p>
            <button className="primary-button" type="submit" disabled={isSaving || isReadingPhoto}>
              {isSaving ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" />}
              {isSaving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

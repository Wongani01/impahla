'use client'

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { Camera, Check, CircleDollarSign, Gift, LoaderCircle } from 'lucide-react'
import { AppDialog } from '@/components/app-dialog'
import {
  CONTRIBUTION_STATUSES,
  contributionStatusLabel,
  type Contribution,
  type ContributionStatus,
  type ContributionType,
} from '@/lib/contribution-store'

type ContributionFormDialogProps = {
  open: boolean
  contribution: Contribution | null
  onClose: () => void
  onSave: (contribution: Contribution) => Promise<boolean>
}

type EventOption = { id: string; eventName: string; category: string }

type FormValues = {
  eventId: string
  contributorName: string
  phoneNumber: string
  contributionType: ContributionType
  cashAmount: string
  giftDescription: string
  giftValue: string
  quantity: string
  note: string
  date: string
  giftImage: string
  contributionStatus: ContributionStatus
}

function blankForm(): FormValues {
  return {
    eventId: '',
    contributorName: '',
    phoneNumber: '',
    contributionType: 'cash',
    cashAmount: '',
    giftDescription: '',
    giftValue: '',
    quantity: '1',
    note: '',
    date: new Date().toISOString().slice(0, 10),
    giftImage: '',
    contributionStatus: 'pledged',
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
  image.crossOrigin = 'anonymous'
  image.src = dataUrl
  await image.decode()
  const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Photo editing is not available in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.78)
}

export function ContributionFormDialog({ open, contribution, onClose, onSave }: ContributionFormDialogProps) {
  const [values, setValues] = useState<FormValues>(blankForm)
  const [eventsList, setEventsList] = useState<EventOption[]>([])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isReadingPhoto, setIsReadingPhoto] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/events', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.events && Array.isArray(data.events)) setEventsList(data.events as EventOption[])
      })
      .catch(() => {})

    setValues(
      contribution
        ? {
            eventId: contribution.eventId,
            contributorName: contribution.contributorName,
            phoneNumber: contribution.phoneNumber,
            contributionType: contribution.contributionType,
            cashAmount: contribution.cashAmount ? String(contribution.cashAmount) : '',
            giftDescription: contribution.giftDescription,
            giftValue: contribution.giftValue ? String(contribution.giftValue) : '',
            quantity: String(contribution.quantity || 1),
            note: contribution.note,
            date: contribution.date,
            giftImage: contribution.giftImage ?? '',
            contributionStatus: contribution.contributionStatus,
          }
        : blankForm(),
    )
    setError('')
    setIsSaving(false)
  }, [open, contribution])

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the gift photo.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Choose a photo smaller than 15 MB.')
      return
    }
    setIsReadingPhoto(true)
    try {
      update('giftImage', await compressPhoto(file))
    } catch {
      setError('This photo could not be added. You can still save a note instead.')
    } finally {
      setIsReadingPhoto(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cashAmount = values.contributionType === 'cash' ? Number(values.cashAmount || 0) : 0
    const giftValue = values.contributionType === 'gift' && values.giftValue.trim() ? Number(values.giftValue) : null
    const quantity = values.contributionType === 'gift' ? Number(values.quantity || 1) : 1

    if (!values.eventId) {
      setError('Select the event this contribution belongs to.')
      return
    }
    if (values.contributorName.trim().length < 2) {
      setError('Add the contributor’s name to continue.')
      return
    }
    if (values.phoneNumber.trim().length < 7) {
      setError('Add a valid phone number.')
      return
    }
    if (values.contributionType === 'cash') {
      if (!Number.isInteger(cashAmount) || cashAmount <= 0) {
        setError('Enter a cash amount greater than zero.')
        return
      }
    } else {
      if (values.giftDescription.trim().length < 2) {
        setError('Describe the gift being contributed.')
        return
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        setError('Quantity must be at least one.')
        return
      }
      if (giftValue !== null && (!Number.isInteger(giftValue) || giftValue < 0)) {
        setError('Enter a valid estimated gift value.')
        return
      }
    }

    setIsSaving(true)
    const saved = await onSave({
      id: contribution?.id ?? crypto.randomUUID(),
      eventId: values.eventId,
      contributorId: contribution?.contributorId ?? null,
      contributorName: values.contributorName.trim(),
      phoneNumber: values.phoneNumber.trim(),
      contributionType: values.contributionType,
      cashAmount,
      giftDescription: values.contributionType === 'gift' ? values.giftDescription.trim() : '',
      giftValue,
      quantity,
      note: values.note.trim(),
      date: values.date,
      contributionStatus: values.contributionStatus,
      giftImage: values.giftImage || null,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      eyebrow={contribution ? 'UPDATE THE REGISTRY' : 'CONTRIBUTE TO EVENT'}
      title={contribution ? 'Edit contribution' : 'Record a contribution'}
      description="Choose the planner's event, then record the cash or gift being given."
      className="form-dialog"
    >
      <form className="contribution-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>
            Target event <span className="required-mark">*</span>
          </span>
          <select
            value={values.eventId}
            onChange={(event) => update('eventId', event.target.value)}
            required
            className="form-select"
          >
            <option value="">Select an open event…</option>
            {contribution && contribution.eventId && !eventsList.some((evt) => evt.id === contribution.eventId) && (
              <option value={contribution.eventId}>Current event</option>
            )}
            {eventsList.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.eventName}
              </option>
            ))}
          </select>
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>
              Contributor name <span className="required-mark">*</span>
            </span>
            <input
              autoFocus
              value={values.contributorName}
              onChange={(event) => update('contributorName', event.target.value)}
              placeholder="e.g. Chanda Phiri"
              autoComplete="name"
              maxLength={120}
              required
            />
          </label>
          <label className="form-field">
            <span>
              Phone number <span className="required-mark">*</span>
            </span>
            <input
              value={values.phoneNumber}
              onChange={(event) => update('phoneNumber', event.target.value)}
              placeholder="e.g. 097 123 4567"
              autoComplete="tel"
              maxLength={30}
              required
            />
          </label>
        </div>

        <fieldset className="form-field status-field">
          <legend>Contribution type</legend>
          <div className="status-choice-row">
            {(['cash', 'gift'] as const).map((type) => (
              <button
                className={`status-choice ${values.contributionType === type ? 'is-selected' : ''}`}
                key={type}
                type="button"
                aria-pressed={values.contributionType === type}
                onClick={() => update('contributionType', type)}
              >
                <span className={`choice-indicator ${values.contributionType === type ? 'checked' : ''}`}>
                  {values.contributionType === type && <Check aria-hidden="true" />}
                </span>
                <span>
                  <strong>{type === 'cash' ? 'Cash contribution' : 'Physical gift'}</strong>
                  <small>{type === 'cash' ? 'Money pledged (ZMW)' : 'Items and parcels'}</small>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {values.contributionType === 'cash' ? (
          <label className="form-field">
            <span>
              Cash amount (ZMW) <span className="required-mark">*</span>
            </span>
            <span className="amount-input-wrap">
              <span>K</span>
              <input type="number" inputMode="numeric" min="1" step="1" value={values.cashAmount} onChange={(event) => update('cashAmount', event.target.value)} placeholder="1000" />
            </span>
          </label>
        ) : (
          <>
            <label className="form-field">
              <span>
                Gift description <span className="required-mark">*</span>
              </span>
              <input value={values.giftDescription} onChange={(event) => update('giftDescription', event.target.value)} placeholder="e.g. Dinner set, groceries, décor" maxLength={255} />
            </label>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  Estimated value <span className="optional-label">Optional</span>
                </span>
                <span className="amount-input-wrap">
                  <span>K</span>
                  <input type="number" inputMode="numeric" min="0" step="1" value={values.giftValue} onChange={(event) => update('giftValue', event.target.value)} placeholder="500" />
                </span>
              </label>
              <label className="form-field">
                <span>Quantity</span>
                <input type="number" inputMode="numeric" min="1" step="1" value={values.quantity} onChange={(event) => update('quantity', event.target.value)} placeholder="1" />
              </label>
            </div>
          </>
        )}

        <div className="form-grid">
          <label className="form-field">
            <span>Date noted</span>
            <input type="date" value={values.date} onChange={(event) => update('date', event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select value={values.contributionStatus} onChange={(event) => update('contributionStatus', event.target.value as ContributionStatus)} className="form-select">
              {CONTRIBUTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {contributionStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>
            Note <span className="optional-label">Optional</span>
          </span>
          <textarea value={values.note} onChange={(event) => update('note', event.target.value)} placeholder="e.g. Paid K500 today, balance K500 next week…" rows={3} maxLength={500} />
        </label>

        <div className="form-field photo-field">
          <span>
            Gift photo <span className="optional-label">Optional</span>
          </span>
          {values.giftImage ? (
            <div className="photo-preview-row">
              <img src={values.giftImage} alt="Preview of the contribution gift" />
              <div>
                <strong>Photo attached</strong>
                <small>Captured live or uploaded</small>
              </div>
              <button className="text-button" type="button" onClick={() => update('giftImage', '')}>
                Remove
              </button>
            </div>
          ) : (
            <label className="photo-picker">
              <span className="photo-picker-icon">
                <Camera aria-hidden="true" />
              </span>
              <span>
                <strong>{isReadingPhoto ? 'Capturing photo…' : 'Take live camera photo'}</strong>
                <small>Tap to open phone camera or choose from gallery</small>
              </span>
              {isReadingPhoto ? <LoaderCircle className="photo-spinner" aria-label="Loading photo" /> : <Camera aria-hidden="true" />}
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Take live camera photo of gift" />
            </label>
          )}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-footer">
          <p>Saved to event registry</p>
          <button className="primary-button" type="submit" disabled={isSaving || isReadingPhoto}>
            {isSaving ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : values.contributionType === 'cash' ? <CircleDollarSign aria-hidden="true" /> : <Gift aria-hidden="true" />}
            {isSaving ? 'Saving…' : contribution ? 'Save changes' : 'Submit contribution'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}

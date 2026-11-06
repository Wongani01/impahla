'use client'

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { Camera, Check, ImagePlus, LoaderCircle } from 'lucide-react'
import { AppDialog } from '@/components/app-dialog'
import type { Contribution, ContributionStatus } from '@/lib/contribution-store'

type ContributionFormDialogProps = {
  open: boolean
  contribution: Contribution | null
  onClose: () => void
  onSave: (contribution: Contribution) => Promise<boolean>
}

type FormValues = {
  name: string
  amount: string
  gift: string
  status: ContributionStatus
  date: string
  note: string
  photo: string
}

function blankForm(): FormValues {
  return {
    name: '',
    amount: '',
    gift: '',
    status: 'received',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    photo: '',
  }
}

async function compressPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this photo.'))
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
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isReadingPhoto, setIsReadingPhoto] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(contribution ? {
      name: contribution.name,
      amount: contribution.amount ? String(contribution.amount) : '',
      gift: contribution.gift,
      status: contribution.status,
      date: contribution.date,
      note: contribution.note,
      photo: contribution.photo ?? '',
    } : blankForm())
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
      update('photo', await compressPhoto(file))
    } catch {
      setError('This photo could not be added. You can still save a note instead.')
    } finally {
      setIsReadingPhoto(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = values.amount.trim() ? Number(values.amount) : 0
    if (!values.name.trim()) {
      setError('Add the contributor’s name to continue.')
      return
    }
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
      setError('Enter a valid cash amount, or leave it blank.')
      return
    }
    if (amount === 0 && !values.gift.trim()) {
      setError('Add a cash amount or describe the gift.')
      return
    }

    setIsSaving(true)
    const saved = await onSave({
      id: contribution?.id ?? crypto.randomUUID(),
      name: values.name.trim(),
      amount,
      gift: values.gift.trim(),
      status: values.status,
      date: values.date,
      note: values.note.trim(),
      ...(values.photo ? { photo: values.photo } : {}),
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      eyebrow={contribution ? 'UPDATE THE REGISTRY' : 'ADD TO THE REGISTRY'}
      title={contribution ? 'Edit contribution' : 'New contribution'}
      description="Keep a note of every promise and every gift received."
      className="form-dialog"
    >
      <form className="contribution-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Contributor name <span className="required-mark">*</span></span>
          <input
            autoFocus
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="e.g. Chanda Phiri"
            autoComplete="name"
            maxLength={80}
            required
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Cash amount</span>
            <span className="amount-input-wrap"><span>K</span><input type="number" inputMode="numeric" min="0" step="1" value={values.amount} onChange={(event) => update('amount', event.target.value)} placeholder="0" /></span>
          </label>
          <label className="form-field">
            <span>Date noted</span>
            <input type="date" value={values.date} onChange={(event) => update('date', event.target.value)} required />
          </label>
        </div>

        <fieldset className="form-field status-field">
          <legend>Contribution status</legend>
          <div className="status-choice-row">
            {(['received', 'promised'] as const).map((status) => (
              <button
                className={`status-choice ${values.status === status ? 'is-selected' : ''}`}
                key={status}
                type="button"
                aria-pressed={values.status === status}
                onClick={() => update('status', status)}
              >
                <span className={`choice-indicator ${values.status === status ? 'checked' : ''}`}>{values.status === status && <Check aria-hidden="true" />}</span>
                <span><strong>{status === 'received' ? 'Received' : 'Promised'}</strong><small>{status === 'received' ? 'Already in hand' : 'Still expected'}</small></span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="form-field">
          <span>Gift or contribution <span className="optional-label">Optional</span></span>
          <input value={values.gift} onChange={(event) => update('gift', event.target.value)} placeholder="e.g. Dinner set, groceries, help with décor" maxLength={120} />
        </label>

        <label className="form-field">
          <span>Note <span className="optional-label">Optional</span></span>
          <textarea value={values.note} onChange={(event) => update('note', event.target.value)} placeholder="A detail you’ll want to remember…" rows={3} maxLength={500} />
        </label>

        <div className="form-field photo-field">
          <span>Gift photo <span className="optional-label">Optional</span></span>
          {values.photo ? (
            <div className="photo-preview-row">
              <img src={values.photo} alt="Preview of the contribution gift" />
              <div><strong>Photo attached</strong><small>Stored only on this device</small></div>
              <button className="text-button" type="button" onClick={() => update('photo', '')}>Remove</button>
            </div>
          ) : (
            <label className="photo-picker">
              <span className="photo-picker-icon"><ImagePlus aria-hidden="true" /></span>
              <span><strong>{isReadingPhoto ? 'Adding photo…' : 'Add a photo'}</strong><small>Take a picture or choose from your device</small></span>
              {isReadingPhoto ? <LoaderCircle className="photo-spinner" aria-label="Loading photo" /> : <Camera aria-hidden="true" />}
              <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Take or choose a gift photo" />
            </label>
          )}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-footer">
          <p>Saved to your account</p>
          <button className="primary-button" type="submit" disabled={isSaving || isReadingPhoto}>
            {isSaving ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {isSaving ? 'Saving…' : contribution ? 'Save changes' : 'Save contribution'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}

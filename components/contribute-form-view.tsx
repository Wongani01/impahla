'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, Camera, CircleDollarSign, Gift, LoaderCircle } from 'lucide-react'
import { formatKwacha, type ContributionType } from '@/lib/contribution-store'

type ContributeFormViewProps = {
  eventId: string
  type: ContributionType
  onDone: () => void
  onCancel: () => void
  notify: (message: string) => void
}

type FormValues = {
  contributorName: string
  phoneNumber: string
  cashAmount: string
  giftDescription: string
  giftValue: string
  quantity: string
  note: string
  giftImage: string
}

function blankForm(): FormValues {
  return {
    contributorName: '',
    phoneNumber: '',
    cashAmount: '',
    giftDescription: '',
    giftValue: '',
    quantity: '1',
    note: '',
    giftImage: '',
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
  const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Photo editing is not available in this browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.78)
}

export function ContributeFormView({ eventId, type, onDone, onCancel, notify }: ContributeFormViewProps) {
  const isCash = type === 'cash'
  const [values, setValues] = useState<FormValues>(blankForm)
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
      setError('This photo could not be added. You can still submit without a photo.')
    } finally {
      setIsReadingPhoto(false)
    }
  }

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const cashAmount = Number(values.cashAmount || 0)
    const giftValue = values.giftValue.trim() ? Number(values.giftValue) : null
    const quantity = Number(values.quantity || 1)

    if (values.contributorName.trim().length < 2) return setError('Add your full name to continue.')
    if (values.phoneNumber.trim().length < 7) return setError('Add a valid phone number.')
    if (isCash) {
      if (!Number.isInteger(cashAmount) || cashAmount <= 0) return setError('Enter a cash amount greater than zero.')
    } else {
      if (values.giftDescription.trim().length < 2) return setError('Describe the gift you are contributing.')
      if (!Number.isInteger(quantity) || quantity < 1) return setError('Quantity must be at least one.')
      if (giftValue !== null && (!Number.isInteger(giftValue) || giftValue < 0)) {
        return setError('Enter a valid estimated value.')
      }
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/events/${eventId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorName: values.contributorName.trim(),
          phoneNumber: values.phoneNumber.trim(),
          contributionType: type,
          cashAmount: isCash ? cashAmount : 0,
          giftDescription: isCash ? '' : values.giftDescription.trim(),
          giftValue: isCash ? null : giftValue,
          quantity: isCash ? 1 : quantity,
          giftImage: values.giftImage || null,
          note: values.note.trim(),
          date: new Date().toISOString().slice(0, 10),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : 'Could not save your contribution.'
        setError(message)
        notify(message)
        return
      }
      notify(isCash ? 'Cash contribution recorded. Thank you!' : 'Gift contribution recorded. Thank you!')
      onDone()
    } catch {
      const message = 'Could not save your contribution. Is the database running?'
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="dashboard-page" aria-labelledby="contribute-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">{isCash ? 'CASH CONTRIBUTION' : 'PHYSICAL GIFT'}</p>
          <h1 id="contribute-heading">{isCash ? 'Contribute cash' : 'Contribute a physical gift'}</h1>
          <p className="page-intro">
            {isCash
              ? 'Record the amount you are giving toward this celebration.'
              : 'Tell the host what you are bringing — you can add a photo and an estimated value.'}
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onCancel}>
          <ArrowLeft aria-hidden="true" />
          Back
        </button>
      </div>

      <div className="list-panel">
        <form className="contribution-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>
                Full name <span className="required-mark">*</span>
              </span>
              <input
                value={values.contributorName}
                onChange={(inputEvent) => update('contributorName', inputEvent.target.value)}
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
                onChange={(inputEvent) => update('phoneNumber', inputEvent.target.value)}
                placeholder="e.g. 097 123 4567"
                autoComplete="tel"
                maxLength={30}
                required
              />
            </label>
          </div>

          {isCash ? (
            <label className="form-field">
              <span>
                Amount (ZMW) <span className="required-mark">*</span>
              </span>
              <span className="amount-input-wrap">
                <span>K</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={values.cashAmount}
                  onChange={(inputEvent) => update('cashAmount', inputEvent.target.value)}
                  placeholder="1000"
                />
              </span>
            </label>
          ) : (
            <>
              <label className="form-field">
                <span>
                  Gift description <span className="required-mark">*</span>
                </span>
                <input
                  value={values.giftDescription}
                  onChange={(inputEvent) => update('giftDescription', inputEvent.target.value)}
                  placeholder="e.g. Dinner set, groceries, décor"
                  maxLength={255}
                />
              </label>
              <div className="form-grid">
                <label className="form-field">
                  <span>
                    Estimated value <span className="optional-label">Optional</span>
                  </span>
                  <span className="amount-input-wrap">
                    <span>K</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={values.giftValue}
                      onChange={(inputEvent) => update('giftValue', inputEvent.target.value)}
                      placeholder="500"
                    />
                  </span>
                </label>
                <label className="form-field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={values.quantity}
                    onChange={(inputEvent) => update('quantity', inputEvent.target.value)}
                    placeholder="1"
                  />
                </label>
              </div>
              <div className="form-field photo-field">
                <span>
                  Gift photo <span className="optional-label">Optional</span>
                </span>
                {values.giftImage ? (
                  <div className="photo-preview-row">
                    <img src={values.giftImage} alt="Preview of the gift" />
                    <div>
                      <strong>Photo attached</strong>
                      <small>Helps the host recognise your gift</small>
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
                      <strong>{isReadingPhoto ? 'Capturing photo…' : 'Add a photo of the gift'}</strong>
                      <small>Tap to open your camera or choose from the gallery</small>
                    </span>
                    {isReadingPhoto ? <LoaderCircle className="photo-spinner" aria-label="Loading photo" /> : <Camera aria-hidden="true" />}
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Add a photo of the gift" />
                  </label>
                )}
              </div>
            </>
          )}

          <label className="form-field">
            <span>
              {isCash ? 'Note' : 'Message'} <span className="optional-label">Optional</span>
            </span>
            <textarea
              value={values.note}
              onChange={(inputEvent) => update('note', inputEvent.target.value)}
              placeholder={isCash ? 'e.g. Paying K500 today, balance next week…' : 'e.g. A short message for the host…'}
              rows={3}
              maxLength={500}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-footer">
            <p>{isCash ? `Pledging toward this event` : `Gift for this event${values.giftValue ? ` · ~${formatKwacha(Number(values.giftValue) || 0)}` : ''}`}</p>
            <button className="primary-button" type="submit" disabled={isSaving || isReadingPhoto}>
              {isSaving ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : isCash ? <CircleDollarSign aria-hidden="true" /> : <Gift aria-hidden="true" />}
              {isSaving ? 'Submitting…' : isCash ? 'Submit cash contribution' : 'Submit gift'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

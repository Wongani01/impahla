'use client'

import { useState } from 'react'
import { CalendarDays, Check, CircleDollarSign, Gift, PencilLine, Phone, Trash2 } from 'lucide-react'
import { AppDialog } from '@/components/app-dialog'
import {
  contributionStatusLabel,
  formatContributionDate,
  formatKwacha,
  isCashInHand,
  type Contribution,
} from '@/lib/contribution-store'

type ContributionDetailsDialogProps = {
  contribution: Contribution | null
  onClose: () => void
  onEdit: (contribution: Contribution) => void
  onMarkReceived: (contribution: Contribution) => void
  onDelete: (id: string) => Promise<boolean>
}

export function ContributionDetailsDialog({ contribution, onClose, onEdit, onMarkReceived, onDelete }: ContributionDetailsDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const close = () => {
    setConfirmDelete(false)
    onClose()
  }

  const isGift = contribution?.contributionType === 'gift'
  const canMarkReceived = contribution ? !isCashInHand(contribution.contributionStatus) && contribution.contributionStatus !== 'cancelled' : false

  return (
    <AppDialog
      open={Boolean(contribution)}
      onClose={close}
      eyebrow="CONTRIBUTION DETAILS"
      title={contribution?.contributorName ?? 'Contribution'}
      description="A little record of the kindness shared."
      className="details-dialog"
    >
      {contribution && (
        <div className="details-content">
          <div className="details-highlight">
            <div className="details-amount-icon">{isGift ? <Gift aria-hidden="true" /> : <CircleDollarSign aria-hidden="true" />}</div>
            <div>
              <span>{isGift ? 'Physical gift' : 'Cash contribution'}</span>
              <strong>{isGift ? contribution.giftDescription || 'Gift' : formatKwacha(contribution.cashAmount)}</strong>
            </div>
            <span className={`status-pill ${contribution.contributionStatus}`}>
              <span className="status-dot" />
              {contributionStatusLabel(contribution.contributionStatus)}
            </span>
          </div>
          <div className="details-grid">
            <div>
              <span>Noted on</span>
              <strong>
                <CalendarDays aria-hidden="true" />
                {formatContributionDate(contribution.date)}
              </strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>
                <Phone aria-hidden="true" />
                {contribution.phoneNumber || '—'}
              </strong>
            </div>
            {isGift ? (
              <>
                <div>
                  <span>Quantity</span>
                  <strong>{contribution.quantity}</strong>
                </div>
                <div>
                  <span>Estimated value</span>
                  <strong>{contribution.giftValue ? formatKwacha(contribution.giftValue) : 'Not stated'}</strong>
                </div>
              </>
            ) : (
              <div>
                <span>Type</span>
                <strong>Cash contribution</strong>
              </div>
            )}
          </div>
          {contribution.giftImage && <img className="details-photo" src={contribution.giftImage} alt={`Gift from ${contribution.contributorName}`} />}
          {contribution.note && (
            <div className="details-note">
              <span>Note</span>
              <p>{contribution.note}</p>
            </div>
          )}
          <div className="details-actions">
            {canMarkReceived && (
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  onMarkReceived(contribution)
                  close()
                }}
              >
                <Check aria-hidden="true" />
                Mark as received
              </button>
            )}
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                onEdit(contribution)
                close()
              }}
            >
              <PencilLine aria-hidden="true" />
              Edit record
            </button>
          </div>
          {confirmDelete ? (
            <div className="delete-confirmation" role="group" aria-label="Confirm deleting contribution">
              <span>Remove this contribution?</span>
              <button
                type="button"
                className="text-button danger-text"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true)
                  if (await onDelete(contribution.id)) close()
                  setIsDeleting(false)
                }}
              >
                {isDeleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <button className="delete-button" type="button" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden="true" />
              Remove from registry
            </button>
          )}
        </div>
      )}
    </AppDialog>
  )
}

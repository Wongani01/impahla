'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type AppDialogProps = {
  open: boolean
  title: string
  eyebrow?: string
  description?: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function AppDialog({
  open,
  title,
  eyebrow,
  description,
  onClose,
  children,
  className = '',
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={`app-dialog ${className}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="dialog-topline">
        <div>
          {eyebrow && <p className="dialog-eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId} className="dialog-description">{description}</p>}
        </div>
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close dialog">
          <X aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

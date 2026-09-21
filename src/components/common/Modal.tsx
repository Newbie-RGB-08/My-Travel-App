import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const node = (
    <div
      className="modal-scrim"
      onClick={onClose}
    >
      <div
        className={`card glass-thick modal-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden ${sizeMap[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
            <h3 className="text-base font-semibold text-fg-1">{title}</h3>
            <button
              type="button"
              className="btn-ghost -mr-1 p-1"
              onClick={onClose}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(node, document.body)
}

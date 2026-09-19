import { useModalStore } from '@/store/useModalStore'
import { Modal } from './Modal'

export function ConfirmDialog() {
  const { confirm, closeConfirm } = useModalStore()

  const handleConfirm = () => {
    const cb = confirm.onConfirm
    closeConfirm()
    cb?.()
  }
  const handleCancel = () => {
    const cb = confirm.onCancel
    closeConfirm()
    cb?.()
  }

  return (
    <Modal
      open={confirm.open}
      onClose={handleCancel}
      title={confirm.title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleCancel}>
            {confirm.cancelLabel}
          </button>
          <button
            type="button"
            className={confirm.danger ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
          >
            {confirm.confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{confirm.message}</p>
    </Modal>
  )
}

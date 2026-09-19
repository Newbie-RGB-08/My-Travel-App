import { useModalStore } from '@/store/useModalStore'
import { Modal } from './Modal'

// 全局弹窗容器：渲染 useModalStore.content
export function ModalHost() {
  const { content, close } = useModalStore()
  return (
    <Modal open={content !== null} onClose={close} size="md">
      {content ?? null}
    </Modal>
  )
}

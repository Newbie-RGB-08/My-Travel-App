import { create } from 'zustand'
import type { ReactNode } from 'react'

interface ModalState {
  // 当前打开的弹窗内容
  content: ReactNode | null
  open: (node: ReactNode) => void
  close: () => void
  // 确认框
  confirm: {
    open: boolean
    title: string
    message: string
    onConfirm: (() => void) | null
    onCancel: (() => void) | null
    confirmLabel: string
    cancelLabel: string
    danger: boolean
  }
  openConfirm: (opts: {
    title?: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }) => void
  closeConfirm: () => void
}

export const useModalStore = create<ModalState>((set) => ({
  content: null,
  open: (node) => set({ content: node }),
  close: () => set({ content: null }),
  confirm: {
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmLabel: '确定',
    cancelLabel: '取消',
    danger: false,
  },
  openConfirm: (opts) =>
    set({
      confirm: {
        open: true,
        title: opts.title ?? '请确认',
        message: opts.message,
        onConfirm: opts.onConfirm,
        onCancel: opts.onCancel ?? null,
        confirmLabel: opts.confirmLabel ?? '确定',
        cancelLabel: opts.cancelLabel ?? '取消',
        danger: opts.danger ?? false,
      },
    }),
  closeConfirm: () =>
    set((s) => ({
      confirm: {
        ...s.confirm,
        open: false,
        onConfirm: null,
        onCancel: null,
      },
    })),
}))

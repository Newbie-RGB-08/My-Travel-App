import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { Upload, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea, Checkbox } from '@/components/forms/Field'
import { db } from '@/db/schema'
import * as crud from '@/db/crud'
import type {
  Attachment,
  Guide,
  GuideCategory,
  NewGuide,
} from '@/types'

interface GuideFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewGuide) => Promise<void>
  initial?: Guide | null
  defaultTripId?: string | null
}

interface FormValues {
  title: string
  destination: string
  category: GuideCategory
  content: string
  tags: string
  favorite: boolean
  tripId: string
}

export const CATEGORY_OPTIONS: { value: GuideCategory; label: string }[] = [
  { value: 'sight', label: '景点' },
  { value: 'food', label: '美食' },
  { value: 'shop', label: '购物' },
  { value: 'culture', label: '文化' },
  { value: 'pitfall', label: '避坑' },
  { value: 'gear', label: '装备' },
]

function buildDefaults(
  initial?: Guide | null,
  defaultTripId?: string | null,
): FormValues {
  if (initial) {
    return {
      title: initial.title,
      destination: initial.destination,
      category: initial.category,
      content: initial.content,
      tags: initial.tags.join(', '),
      favorite: initial.favorite,
      tripId: initial.tripId ?? '',
    }
  }
  return {
    title: '',
    destination: '',
    category: 'sight',
    content: '',
    tags: '',
    favorite: false,
    tripId: defaultTripId ?? '',
  }
}

// 单个附件预览，自管 URL 生命周期
function AttachmentThumb({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove: () => void
}) {
  const url = useMemo(
    () => URL.createObjectURL(attachment.blob),
    [attachment],
  )
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded border border-line">
      <img src={url} alt="附件" className="h-full w-full object-cover" />
      <button
        type="button"
        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white opacity-0 hover:bg-black/70 group-hover:opacity-100"
        onClick={onRemove}
        aria-label="删除附件"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function GuideFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  defaultTripId,
}: GuideFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').toArray(), []) ?? []
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: buildDefaults(initial, defaultTripId),
  })

  // initial/defaultTripId 变化时重置表单 + 加载已有附件
  useEffect(() => {
    reset(buildDefaults(initial, defaultTripId))
    let cancelled = false
    ;(async () => {
      if (initial?.attachmentIds?.length) {
        const atts = await Promise.all(
          initial.attachmentIds.map((id) => crud.getAttachment(id)),
        )
        if (!cancelled) {
          setAttachments(atts.filter(Boolean) as Attachment[])
        }
      } else {
        setAttachments([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initial, defaultTripId, reset])

  // 粘贴图片
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const att = await crud.addAttachment({ blob, mime: blob.type })
        setAttachments((prev) => [...prev, att])
      }
    }
  }

  // 文件选择上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const att = await crud.addAttachment({ blob: file, mime: file.type })
      setAttachments((prev) => [...prev, att])
    }
    e.target.value = ''
  }

  const handleRemoveAttachment = async (id: string) => {
    await crud.removeAttachment(id)
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const submit = handleSubmit(async (v) => {
    setSubmitting(true)
    try {
      await onSubmit({
        title: v.title.trim(),
        destination: v.destination.trim(),
        category: v.category,
        content: v.content,
        tags: v.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        favorite: v.favorite,
        tripId: v.tripId || null,
        attachmentIds: attachments.map((a) => a.id),
      })
      reset()
      setAttachments([])
      onClose()
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '编辑攻略' : '新建攻略'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            onClick={submit}
          >
            保存
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="标题" required>
          <TextInput {...register('title', { required: true })} placeholder="如：故宫半日游攻略" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="目的地">
            <TextInput {...register('destination')} placeholder="如：北京" />
          </Field>
          <Field label="分类">
            <Select {...register('category')}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="正文" hint="支持粘贴截图（Ctrl/Cmd+V）">
          <TextArea
            {...register('content')}
            className="min-h-[160px]"
            onPaste={handlePaste}
            placeholder="写下攻略正文，可粘贴截图..."
          />
        </Field>
        {/* 附件区 */}
        <Field label="图片附件">
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-line px-3 py-1.5 text-xs text-fg-2 transition-colors hover:bg-white/8">
              <Upload className="h-3 w-3" />
              选择图片上传
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <AttachmentThumb
                    key={a.id}
                    attachment={a}
                    onRemove={() => handleRemoveAttachment(a.id)}
                  />
                ))}
              </div>
            )}
            {attachments.length === 0 && (
              <p className="text-xs text-fg-3">
                也可在正文区域直接 Ctrl+V 粘贴截图
              </p>
            )}
          </div>
        </Field>
        <Field label="标签" hint="多个用逗号分隔">
          <TextInput {...register('tags')} placeholder="如：免费, 亲子" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="关联行程">
            <Select {...register('tripId')}>
              <option value="">未关联</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="收藏">
            <Checkbox {...register('favorite')} label="标记为收藏" />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

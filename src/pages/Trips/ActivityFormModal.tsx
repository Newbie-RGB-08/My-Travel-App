import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea, Checkbox } from '@/components/forms/Field'
import { db } from '@/db/schema'
import { formatMoney } from '@/utils/format'
import type {
  Activity,
  ActivitySlot,
  ActivityType,
  NewActivity,
} from '@/types'

interface ActivityFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewActivity) => Promise<void>
  initial?: Activity | null
  tripId: string | null
  defaultDate?: string
}

interface FormValues {
  date: string
  slot: ActivitySlot
  time: string
  place: string
  type: ActivityType
  note: string
}

const SLOT_LABELS: { value: ActivitySlot; label: string }[] = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
]

const TYPE_LABELS: { value: ActivityType; label: string }[] = [
  { value: 'sight', label: '景点' },
  { value: 'food', label: '餐饮' },
  { value: 'shop', label: '购物' },
  { value: 'rest', label: '休息' },
]

function buildDefaults(initial?: Activity | null, defaultDate?: string): FormValues {
  if (initial) {
    return {
      date: initial.date,
      slot: initial.slot,
      time: initial.time ?? '',
      place: initial.place,
      type: initial.type,
      note: initial.note,
    }
  }
  return {
    date: defaultDate ?? '',
    slot: 'morning',
    time: '',
    place: '',
    type: 'sight',
    note: '',
  }
}

export function ActivityFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  tripId,
  defaultDate,
}: ActivityFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  // 关联项（数组），用本地 state 管理，便于多选
  const [linkedTransportIds, setLinkedTransportIds] = useState<string[]>(
    initial?.linkedTransportIds ?? [],
  )
  const [linkedExpenseIds, setLinkedExpenseIds] = useState<string[]>(
    initial?.linkedExpenseIds ?? [],
  )
  const [linkedGuideIds, setLinkedGuideIds] = useState<string[]>(
    initial?.linkedGuideIds ?? [],
  )

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: buildDefaults(initial, defaultDate),
  })

  // 本行程下的交通/消费/攻略，供关联选择
  const transports = useLiveQuery(
    () =>
      tripId
        ? db.transports.where('tripId').equals(tripId).toArray()
        : [],
    [tripId],
  ) ?? []
  const expenses = useLiveQuery(
    () =>
      tripId
        ? db.expenses.where('tripId').equals(tripId).toArray()
        : [],
    [tripId],
  ) ?? []
  const guides = useLiveQuery(
    () =>
      tripId
        ? db.guides.where('tripId').equals(tripId).toArray()
        : [],
    [tripId],
  ) ?? []

  // initial/defaultDate 变化时重置表单 + 关联项
  useEffect(() => {
    reset(buildDefaults(initial, defaultDate))
    setLinkedTransportIds(initial?.linkedTransportIds ?? [])
    setLinkedExpenseIds(initial?.linkedExpenseIds ?? [])
    setLinkedGuideIds(initial?.linkedGuideIds ?? [])
  }, [initial, defaultDate, reset])

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
  ) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const submit = handleSubmit(async (v) => {
    setSubmitting(true)
    try {
      await onSubmit({
        tripId,
        date: v.date,
        slot: v.slot,
        time: v.time || null,
        place: v.place.trim(),
        type: v.type,
        note: v.note.trim(),
        linkedExpenseIds,
        linkedTransportIds,
        linkedGuideIds,
      })
      reset()
      setLinkedTransportIds([])
      setLinkedExpenseIds([])
      setLinkedGuideIds([])
      onClose()
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '编辑活动' : '新建活动'}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="日期" required>
            <TextInput type="date" {...register('date', { required: true })} />
          </Field>
          <Field label="时段" required>
            <Select {...register('slot')}>
              {SLOT_LABELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="时间">
            <TextInput type="time" {...register('time')} />
          </Field>
          <Field label="类型">
            <Select {...register('type')}>
              {TYPE_LABELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="地点">
          <TextInput {...register('place')} placeholder="如：故宫" />
        </Field>
        <Field label="备注">
          <TextArea {...register('note')} />
        </Field>

        {/* 跨模块关联：选本行程下的交通/消费/攻略 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="关联交通" hint={`已选 ${linkedTransportIds.length}`}>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {transports.length === 0 ? (
                <span className="text-xs text-gray-400">本行程暂无交通</span>
              ) : (
                transports.map((t) => (
                  <Checkbox
                    key={t.id}
                    label={`${t.no || `${t.from}→${t.to}`}`}
                    checked={linkedTransportIds.includes(t.id)}
                    onChange={() => toggle(setLinkedTransportIds, t.id)}
                  />
                ))
              )}
            </div>
          </Field>
          <Field label="关联消费" hint={`已选 ${linkedExpenseIds.length}`}>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {expenses.length === 0 ? (
                <span className="text-xs text-gray-400">本行程暂无消费</span>
              ) : (
                expenses.map((e) => (
                  <Checkbox
                    key={e.id}
                    label={`${formatMoney(e.amount)} ${
                      e.place || e.note || ''
                    }`.trim()}
                    checked={linkedExpenseIds.includes(e.id)}
                    onChange={() => toggle(setLinkedExpenseIds, e.id)}
                  />
                ))
              )}
            </div>
          </Field>
          <Field label="关联攻略" hint={`已选 ${linkedGuideIds.length}`}>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {guides.length === 0 ? (
                <span className="text-xs text-gray-400">本行程暂无攻略</span>
              ) : (
                guides.map((g) => (
                  <Checkbox
                    key={g.id}
                    label={g.title}
                    checked={linkedGuideIds.includes(g.id)}
                    onChange={() => toggle(setLinkedGuideIds, g.id)}
                  />
                ))
              )}
            </div>
          </Field>
        </div>
        <p className="text-xs text-gray-400">
          关联后，活动卡片会显示 🚄/💰/📖 图标，点击可跳转到对应模块并高亮。
        </p>
      </form>
    </Modal>
  )
}

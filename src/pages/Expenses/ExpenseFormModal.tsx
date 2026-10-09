import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea } from '@/components/forms/Field'
import { db } from '@/db/schema'
import { ownerByTrip, ownerTripsAsc } from '@/db/scope'
import type {
  Expense,
  ExpenseCategory,
  NewExpense,
} from '@/types'

interface ExpenseFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewExpense) => Promise<void>
  initial?: Expense | null
  defaultTripId?: string | null
}

interface FormValues {
  amount: string
  currency: string
  category: ExpenseCategory
  time: string // datetime-local
  place: string
  note: string
  tripId: string // "" = 未关联
  activityId: string // "" = 未关联
}

export const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'transport', label: '交通' },
  { value: 'stay', label: '住宿' },
  { value: 'food', label: '餐饮' },
  { value: 'ticket', label: '门票' },
  { value: 'shop', label: '购物' },
  { value: 'other', label: '其他' },
]

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function buildDefaults(
  initial?: Expense | null,
  defaultTripId?: string | null,
): FormValues {
  if (initial) {
    return {
      amount: String(initial.amount),
      currency: initial.currency,
      category: initial.category,
      time: toDatetimeLocalValue(initial.time),
      place: initial.place,
      note: initial.note,
      tripId: initial.tripId ?? '',
      activityId: initial.activityId ?? '',
    }
  }
  return {
    amount: '',
    currency: 'CNY',
    category: 'food',
    time: '',
    place: '',
    note: '',
    tripId: defaultTripId ?? '',
    activityId: '',
  }
}

export function ExpenseFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  defaultTripId,
}: ExpenseFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const trips = useLiveQuery(() => ownerTripsAsc(), []) ?? []
  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: buildDefaults(initial, defaultTripId),
  })

  // initial/defaultTripId 变化时重置表单
  useEffect(() => {
    reset(buildDefaults(initial, defaultTripId))
  }, [initial, defaultTripId, reset])

  // 关联活动随当前 tripId 变化
  const watchTripId = watch('tripId')
  const activities =
    useLiveQuery(
      () => (watchTripId ? ownerByTrip(db.activities, watchTripId) : []),
      [watchTripId],
    ) ?? []

  const submit = handleSubmit(async (v) => {
    setSubmitting(true)
    try {
      await onSubmit({
        amount: Number(v.amount) || 0,
        currency: v.currency || 'CNY',
        category: v.category,
        time: v.time,
        place: v.place.trim(),
        note: v.note.trim(),
        tripId: v.tripId || null,
        activityId: v.activityId || null,
      })
      reset()
      onClose()
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '编辑消费记录' : '新建消费记录'}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="金额" required>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { required: true })}
              placeholder="如：123.45"
            />
          </Field>
          <Field label="分类" required>
            <Select {...register('category')}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="时间" required>
            <TextInput type="datetime-local" {...register('time', { required: true })} />
          </Field>
          <Field label="货币">
            <TextInput {...register('currency')} placeholder="CNY" />
          </Field>
        </div>
        <Field label="地点">
          <TextInput {...register('place')} placeholder="如：故宫南门售票处" />
        </Field>
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
        <Field label="关联活动" hint="选择行程后可选该行程下的活动">
          <Select {...register('activityId')} disabled={!watchTripId}>
            <option value="">未关联</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.date} {a.place || '未命名'}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="备注">
          <TextArea {...register('note')} />
        </Field>
      </form>
    </Modal>
  )
}

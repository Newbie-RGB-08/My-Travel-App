import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea } from '@/components/forms/Field'
import { db } from '@/db/schema'
import type {
  NewTransport,
  Transport,
  TransportStatus,
  TransportType,
} from '@/types'

interface TransportFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewTransport) => Promise<void>
  initial?: Transport | null
  defaultTripId?: string | null
}

interface FormValues {
  type: TransportType
  no: string
  from: string
  to: string
  departAt: string // datetime-local: YYYY-MM-DDTHH:mm
  arriveAt: string
  seat: string
  terminal: string
  checkinInfo: string
  note: string
  status: TransportStatus
  tripId: string // "" = 未关联
}

const TYPE_OPTIONS: { value: TransportType; label: string }[] = [
  { value: 'flight', label: '航班' },
  { value: 'train', label: '火车' },
  { value: 'bus', label: '大巴' },
  { value: 'metro', label: '地铁' },
  { value: 'taxi', label: '出租' },
  { value: 'self', label: '自驾' },
]

const STATUS_OPTIONS: { value: TransportStatus; label: string }[] = [
  { value: 'pending', label: '待出行' },
  { value: 'done', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

// datetime-local 值为 "YYYY-MM-DDTHH:mm"（16 字符）。存储的 ISO 可能带秒/Z，统一截断。
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function buildDefaults(
  initial?: Transport | null,
  defaultTripId?: string | null,
): FormValues {
  if (initial) {
    return {
      type: initial.type,
      no: initial.no,
      from: initial.from,
      to: initial.to,
      departAt: toDatetimeLocalValue(initial.departAt),
      arriveAt: toDatetimeLocalValue(initial.arriveAt),
      seat: initial.seat,
      terminal: initial.terminal,
      checkinInfo: initial.checkinInfo,
      note: initial.note,
      status: initial.status,
      tripId: initial.tripId ?? '',
    }
  }
  return {
    type: 'flight',
    no: '',
    from: '',
    to: '',
    departAt: '',
    arriveAt: '',
    seat: '',
    terminal: '',
    checkinInfo: '',
    note: '',
    status: 'pending',
    tripId: defaultTripId ?? '',
  }
}

export function TransportFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  defaultTripId,
}: TransportFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').toArray(), []) ?? []

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: buildDefaults(initial, defaultTripId),
  })

  // initial/defaultTripId 变化时重置表单
  useEffect(() => {
    reset(buildDefaults(initial, defaultTripId))
  }, [initial, defaultTripId, reset])

  const submit = handleSubmit(async (v) => {
    setSubmitting(true)
    try {
      await onSubmit({
        type: v.type,
        no: v.no.trim(),
        from: v.from.trim(),
        to: v.to.trim(),
        departAt: v.departAt,
        arriveAt: v.arriveAt || null,
        seat: v.seat.trim(),
        terminal: v.terminal.trim(),
        checkinInfo: v.checkinInfo.trim(),
        note: v.note.trim(),
        status: v.status,
        tripId: v.tripId || null,
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
      title={initial ? '编辑交通安排' : '新建交通安排'}
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
          <Field label="类型" required>
            <Select {...register('type')}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="状态">
            <Select {...register('status')}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="班次号" hint="如：CA1234、G123、D802">
          <TextInput {...register('no')} placeholder="如：CA1234" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="出发地" required>
            <TextInput {...register('from', { required: true })} placeholder="如：北京首都机场" />
          </Field>
          <Field label="目的地" required>
            <TextInput {...register('to', { required: true })} placeholder="如：上海虹桥" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="出发时间" required>
            <TextInput type="datetime-local" {...register('departAt', { required: true })} />
          </Field>
          <Field label="到达时间">
            <TextInput type="datetime-local" {...register('arriveAt')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="座位">
            <TextInput {...register('seat')} placeholder="如：12A" />
          </Field>
          <Field label="站台/航站楼">
            <TextInput {...register('terminal')} placeholder="如：T2、2 站台" />
          </Field>
        </div>
        <Field label="值机/检票信息">
          <TextInput {...register('checkinInfo')} placeholder="如：提前 2 小时值机" />
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
        <Field label="备注">
          <TextArea {...register('note')} />
        </Field>
      </form>
    </Modal>
  )
}

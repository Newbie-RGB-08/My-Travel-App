import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select } from '@/components/forms/Field'
import type { NewTrip, Trip, TripStatus } from '@/types'

interface TripFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewTrip) => Promise<void>
  initial?: Trip | null
}

interface FormValues {
  name: string
  destination: string
  startDate: string
  endDate: string
  companions: string
  budget: string
  status: TripStatus
}

const STATUS_LABELS: { value: TripStatus; label: string }[] = [
  { value: 'planning', label: '计划中' },
  { value: 'ongoing', label: '进行中' },
  { value: 'done', label: '已完成' },
]

export function TripFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: TripFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: initial
      ? {
          ...initial,
          companions: initial.companions.join(', '),
          budget: String(initial.budget),
        }
      : {
          name: '',
          destination: '',
          startDate: '',
          endDate: '',
          companions: '',
          budget: '0',
          status: 'planning',
        },
  })

  const submit = handleSubmit(async (v) => {
    setSubmitting(true)
    try {
      await onSubmit({
        name: v.name.trim(),
        destination: v.destination.trim(),
        startDate: v.startDate,
        endDate: v.endDate,
        companions: v.companions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        budget: Number(v.budget) || 0,
        status: v.status,
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
      title={initial ? '编辑行程' : '新建行程'}
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
        <Field label="行程名称" required>
          <TextInput {...register('name', { required: true })} placeholder="如：十一北京5日游" />
        </Field>
        <Field label="目的地">
          <TextInput {...register('destination')} placeholder="如：北京" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="开始日期">
            <TextInput type="date" {...register('startDate')} />
          </Field>
          <Field label="结束日期">
            <TextInput type="date" {...register('endDate')} />
          </Field>
        </div>
        <Field label="同行人" hint="多人用逗号分隔">
          <TextInput {...register('companions')} placeholder="如：张三, 李四" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="预算（元）">
            <TextInput type="number" step="0.01" min="0" {...register('budget')} />
          </Field>
          <Field label="状态">
            <Select {...register('status')}>
              {STATUS_LABELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}

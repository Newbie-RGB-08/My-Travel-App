import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea } from '@/components/forms/Field'
import { db } from '@/db/schema'
import { MARK_META } from './markMeta'
import type { MapMark, MapMarkType, NewMapMark } from '@/types'

export const MARK_TYPE_OPTIONS: {
  value: MapMarkType
  label: string
}[] = (Object.keys(MARK_META) as MapMarkType[]).map((value) => ({
  value,
  label: MARK_META[value].label,
}))

interface MarkFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewMapMark) => Promise<void>
  initial?: MapMark | null
  defaultLat?: number
  defaultLng?: number
  defaultTripId?: string | null
}

interface FormValues {
  name: string
  type: MapMarkType
  lat: string
  lng: string
  note: string
  tripId: string
}

function buildDefaults(
  initial?: MapMark | null,
  defaultLat?: number,
  defaultLng?: number,
  defaultTripId?: string | null,
): FormValues {
  if (initial) {
    return {
      name: initial.name,
      type: initial.type,
      lat: String(initial.lat),
      lng: String(initial.lng),
      note: initial.note,
      tripId: initial.tripId ?? '',
    }
  }
  return {
    name: '',
    type: 'sight',
    lat: defaultLat !== undefined ? String(defaultLat) : '',
    lng: defaultLng !== undefined ? String(defaultLng) : '',
    note: '',
    tripId: defaultTripId ?? '',
  }
}

export function MarkFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  defaultLat,
  defaultLng,
  defaultTripId,
}: MarkFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').toArray(), []) ?? []
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    defaultValues: buildDefaults(initial, defaultLat, defaultLng, defaultTripId),
  })

  // initial/default 坐标变化时重置表单
  useEffect(() => {
    reset(buildDefaults(initial, defaultLat, defaultLng, defaultTripId))
  }, [initial, defaultLat, defaultLng, defaultTripId, reset])

  const submit = handleSubmit(async (v) => {
    const lat = parseFloat(v.lat)
    const lng = parseFloat(v.lng)
    if (!v.name.trim() || Number.isNaN(lat) || Number.isNaN(lng)) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: v.name.trim(),
        type: v.type,
        lat,
        lng,
        note: v.note,
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
      title={initial ? '编辑标注' : '新建标注'}
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
        <Field label="名称" required>
          <TextInput
            {...register('name', { required: true })}
            placeholder="如：故宫"
          />
        </Field>
        <Field label="类型">
          <Select {...register('type')}>
            {MARK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="纬度" required>
            <TextInput
              {...register('lat', { required: true })}
              placeholder="如：39.9163"
              inputMode="decimal"
            />
          </Field>
          <Field label="经度" required>
            <TextInput
              {...register('lng', { required: true })}
              placeholder="如：116.3972"
              inputMode="decimal"
            />
          </Field>
        </div>
        <Field label="备注">
          <TextArea {...register('note')} placeholder="如：南门进、提前预约" />
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
        {formState.errors.name && (
          <p className="text-xs text-danger">请填写名称</p>
        )}
      </form>
    </Modal>
  )
}

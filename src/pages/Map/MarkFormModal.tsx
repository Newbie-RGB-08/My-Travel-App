import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { Loader2, MapPinned, Search } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea } from '@/components/forms/Field'
import { ownerTripsAsc } from '@/db/scope'
import { MARK_META } from './markMeta'
import { searchPlaces, type PlaceResult } from './placeSearch'
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
  note: string
  tripId: string
}

type Coord = { lat: number; lng: number }

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

  // 标注坐标：由搜索选定地点或地图点击自动确定，用户无需手工输入经纬度
  const [coord, setCoord] = useState<Coord | null>(null)
  // 已选定的地点（搜索模式）
  const [picked, setPicked] = useState<PlaceResult | null>(null)
  // 是否正在展示搜索面板（新建搜索模式初始为 true；编辑/点击模式可手动呼出）
  const [searching, setSearching] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PlaceResult[]>([])

  const trips = useLiveQuery(() => ownerTripsAsc(), []) ?? []

  const isEdit = !!initial
  // 地图点击模式：带默认坐标进入
  const isMapClick =
    !initial && defaultLat !== undefined && defaultLng !== undefined

  const fieldDefaults: FormValues = {
    name: initial?.name ?? '',
    type: initial?.type ?? 'sight',
    note: initial?.note ?? '',
    tripId: initial?.tripId ?? defaultTripId ?? '',
  }

  const { register, handleSubmit, reset, control } = useForm<FormValues>({
    defaultValues: fieldDefaults,
  })
  const nameValue = useWatch({ control, name: 'name' })

  // 弹窗打开 / 目标变化时重置全部状态
  useEffect(() => {
    if (!open) return
    reset(fieldDefaults)
    if (initial) {
      setCoord({ lat: initial.lat, lng: initial.lng })
      setPicked(null)
      setSearching(false)
    } else if (defaultLat !== undefined && defaultLng !== undefined) {
      setCoord({ lat: defaultLat, lng: defaultLng })
      setPicked(null)
      setSearching(false)
    } else {
      setCoord(null)
      setPicked(null)
      setSearching(true)
    }
    setKeyword('')
    setResults([])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultLat, defaultLng, defaultTripId, reset])

  // 搜索防抖（300ms）+ 过期请求保护
  const seqRef = useRef(0)
  useEffect(() => {
    if (!searching) return
    const kw = keyword.trim()
    if (!kw) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const seq = ++seqRef.current
    const timer = window.setTimeout(async () => {
      try {
        const list = await searchPlaces(kw)
        if (seq === seqRef.current) setResults(list)
      } finally {
        if (seq === seqRef.current) setLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [keyword, searching])

  const handlePick = (p: PlaceResult) => {
    setCoord({ lat: p.lat, lng: p.lng })
    setPicked(p)
    setSearching(false)
    setKeyword('')
    setResults([])
    // 名称自动填入（用户仍可修改），类型按结果类别预选
    reset({
      name: p.name,
      type: p.markType,
      note: fieldDefaults.note,
      tripId: fieldDefaults.tripId,
    })
  }

  const openSearch = () => {
    setSearching(true)
    setKeyword('')
    setResults([])
  }

  const submit = handleSubmit(async (v) => {
    if (!coord || !v.name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: v.name.trim(),
        type: v.type,
        lat: coord.lat,
        lng: coord.lng,
        note: v.note,
        tripId: v.tripId || null,
      })
      reset()
      onClose()
    } finally {
      setSubmitting(false)
    }
  })

  const saveDisabled = submitting || !coord || !nameValue?.trim()
  const searched = searching && !loading && keyword.trim() !== ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑标注' : '新建标注'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saveDisabled}
            onClick={submit}
          >
            保存
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        {searching ? (
          <Field label="搜索地点" required>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" />
              <TextInput
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="输入景区、酒店、地标、美食、车站等，如：故宫"
                className="pl-9"
                autoFocus
                aria-label="搜索地点"
              />
            </div>

            {loading && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在搜索…
              </p>
            )}

            {results.length > 0 && (
              <ul className="mt-2 space-y-1" data-place-results>
                {results.map((r, i) => (
                  <li key={`${r.name}-${i}`}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-control border border-transparent px-2.5 py-2 text-left hover:border-line hover:bg-white/6"
                      onClick={() => handlePick(r)}
                    >
                      <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg-1">
                          {r.name}
                        </span>
                        <span className="block truncate text-xs text-fg-3">
                          {[r.region, r.address].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {searched && results.length === 0 && (
              <p className="mt-2 text-xs text-fg-3">
                未找到相关地点，请更换关键词后重试。
              </p>
            )}
          </Field>
        ) : (
          <>
            {/* 已选位置条：展示地点来源，可呼出重新搜索 */}
            <div className="glass-thin flex items-center gap-2 px-3 py-2">
              <MapPinned className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1 truncate text-xs text-fg-2">
                {picked
                  ? `位置：${picked.name}${picked.address ? ` · ${picked.address}` : ''}`
                  : isMapClick
                    ? '位置：地图上选定的点'
                    : '位置：原标注地点'}
              </span>
              <button
                type="button"
                className="btn-ghost shrink-0 px-1.5 py-0.5 text-xs"
                onClick={openSearch}
              >
                重新搜索
              </button>
            </div>

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
          </>
        )}
      </form>
    </Modal>
  )
}

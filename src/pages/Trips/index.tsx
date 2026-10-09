import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, eachDayOfInterval, parseISO, isValid } from 'date-fns'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Clock, Train, Wallet, BookOpen, Compass } from 'lucide-react'

import { db } from '@/db/schema'
import { ownerGet, ownerTripsDesc, ownerByTrip } from '@/db/scope'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { TripCard } from './TripCard'
import { TripFormModal } from './TripFormModal'
import { ActivityFormModal } from './ActivityFormModal'
import { StatusBadge } from './TripCard'
import { formatMoney } from '@/utils/format'
import type { Activity, ActivitySlot, NewActivity, NewTrip, Trip } from '@/types'

const SLOTS: { value: ActivitySlot; label: string }[] = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
]

const TYPE_LABELS: Record<Activity['type'], string> = {
  sight: '景点',
  food: '餐饮',
  shop: '购物',
  rest: '休息',
}

export default function Trips() {
  const { currentTripId, setCurrentTrip } = useTripStore()
  const { openConfirm } = useModalStore()

  const trips = useLiveQuery(() => ownerTripsDesc(), []) ?? []
  const currentTrip = useLiveQuery(
    () => (currentTripId ? ownerGet(db.trips, currentTripId) : undefined),
    [currentTripId],
  )

  const [tripModal, setTripModal] = useState<{ open: boolean; initial: Trip | null }>({
    open: false,
    initial: null,
  })
  const [activityModal, setActivityModal] = useState<{
    open: boolean
    initial: Activity | null
    defaultDate?: string
  }>({ open: false, initial: null })

  // 列表视图
  if (!currentTripId || !currentTrip) {
    return (
      <div className="px-6 py-6">
        <PageHeader
          title="行程计划"
          subtitle="一次行程是顶层单位，下面的活动按天按时段组织。"
          actions={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setTripModal({ open: true, initial: null })}
            >
              <Plus className="h-4 w-4" />
              新建行程
            </button>
          }
        />

        {trips.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Compass className="h-12 w-12" />}
              title="还没有行程"
              description="先创建一次行程吧，下面所有的活动、交通、消费、攻略都可以挂到行程。"
              action={
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setTripModal({ open: true, initial: null })}
                >
                  <Plus className="h-4 w-4" />
                  创建第一个行程
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                active={t.id === currentTripId}
                onClick={() => setCurrentTrip(t.id)}
                onEdit={() => setTripModal({ open: true, initial: t })}
                onDelete={() =>
                  openConfirm({
                    title: '删除行程',
                    message: `将删除行程「${t.name}」，下面的活动/交通/消费/攻略不会被删除，但会与该行程解除关联。`,
                    confirmLabel: '删除',
                    danger: true,
                    onConfirm: async () => {
                      await crud.removeTrip(t.id)
                      if (currentTripId === t.id) setCurrentTrip(null)
                    },
                  })
                }
              />
            ))}
          </div>
        )}

        <TripFormModal
          key={tripModal.initial?.id ?? 'new-trip'}
          open={tripModal.open}
          initial={tripModal.initial}
          onClose={() => setTripModal({ open: false, initial: null })}
          onSubmit={async (data: NewTrip) => {
            if (tripModal.initial) {
              await crud.updateTrip(tripModal.initial.id, data)
            } else {
              const t = await crud.addTrip(data)
              setCurrentTrip(t.id)
            }
          }}
        />
      </div>
    )
  }

  return (
    <TripDetail
      trip={currentTrip}
      onBack={() => setCurrentTrip(null)}
      onEditTrip={() => setTripModal({ open: true, initial: currentTrip })}
      onAddActivity={(date) =>
        setActivityModal({ open: true, initial: null, defaultDate: date })
      }
      onEditActivity={(a) => setActivityModal({ open: true, initial: a })}
      tripModal={tripModal}
      setTripModal={setTripModal}
      activityModal={activityModal}
      setActivityModal={setActivityModal}
    />
  )
}

interface TripDetailProps {
  trip: Trip
  onBack: () => void
  onEditTrip: () => void
  onAddActivity: (date?: string) => void
  onEditActivity: (a: Activity) => void
  tripModal: { open: boolean; initial: Trip | null }
  setTripModal: (v: { open: boolean; initial: Trip | null }) => void
  activityModal: { open: boolean; initial: Activity | null; defaultDate?: string }
  setActivityModal: (v: {
    open: boolean
    initial: Activity | null
    defaultDate?: string
  }) => void
}

function TripDetail({
  trip,
  onBack,
  onEditTrip,
  onAddActivity,
  onEditActivity,
  tripModal,
  setTripModal,
  activityModal,
  setActivityModal,
}: TripDetailProps) {
  const activities = useLiveQuery(
    () => ownerByTrip(db.activities, trip.id),
    [trip.id],
  ) ?? []

  const grouped = useMemo(() => {
    const byDate: Record<string, Activity[]> = {}
    for (const a of activities) {
      ;(byDate[a.date] ??= []).push(a)
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => a.slot.localeCompare(b.slot)),
      }))
  }, [activities])

  // 行程日期范围（用 date-fns 本地日期，避免 toISOString 时区问题）
  const dates = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return []
    const start = parseISO(trip.startDate)
    const end = parseISO(trip.endDate)
    if (!isValid(start) || !isValid(end) || start > end) return []
    try {
      return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'))
    } catch {
      return []
    }
  }, [trip.startDate, trip.endDate])

  return (
    <div className="px-6 py-6">
      <div className="mb-4">
        <button
          type="button"
          className="btn-ghost -ml-2 mb-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          返回行程列表
        </button>
      </div>

      <PageHeader
        title={trip.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-3 text-xs text-fg-2">
            <StatusBadge status={trip.status} />
            <span>{trip.destination}</span>
            <span>
              {trip.startDate} ~ {trip.endDate}
            </span>
            <span>预算 {formatMoney(trip.budget)}</span>
            {trip.companions.length > 0 && (
              <span>同行 · {trip.companions.join('、')}</span>
            )}
          </span>
        }
        actions={
          <button type="button" className="btn-secondary" onClick={onEditTrip}>
            <Pencil className="h-4 w-4" />
            编辑行程
          </button>
        }
      />

      {grouped.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="还没有活动"
            description="点击下面的按钮为这次行程添加活动，按上午/下午/晚上组织。"
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => onAddActivity(dates[0])}
              >
                <Plus className="h-4 w-4" />
                添加活动
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {dates.length > 0 ? (
            dates.map((date) => (
              <DaySection
                key={date}
                date={date}
                activities={grouped.find((g) => g.date === date)?.items ?? []}
                onAddActivity={() => onAddActivity(date)}
                onEdit={onEditActivity}
              />
            ))
          ) : (
            grouped.map((g) => (
              <DaySection
                key={g.date}
                date={g.date}
                activities={g.items}
                onAddActivity={() => onAddActivity(g.date)}
                onEdit={onEditActivity}
              />
            ))
          )}
        </div>
      )}

      <TripFormModal
        open={tripModal.open}
        initial={tripModal.initial}
        onClose={() => setTripModal({ open: false, initial: null })}
        onSubmit={async (data: NewTrip) => {
          if (tripModal.initial) {
            await crud.updateTrip(tripModal.initial.id, data)
          }
        }}
      />

      <ActivityFormModal
        open={activityModal.open}
        initial={activityModal.initial}
        tripId={trip.id}
        defaultDate={activityModal.defaultDate}
        onClose={() =>
          setActivityModal({ open: false, initial: null, defaultDate: undefined })
        }
        onSubmit={async (data: NewActivity) => {
          if (activityModal.initial) {
            await crud.updateActivity(activityModal.initial.id, data)
          } else {
            await crud.addActivity(data)
          }
        }}
      />
    </div>
  )
}

function DaySection({
  date,
  activities,
  onAddActivity,
  onEdit,
}: {
  date: string
  activities: Activity[]
  onAddActivity: () => void
  onEdit: (a: Activity) => void
}) {
  const { openConfirm } = useModalStore()
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg-1">
          {date || '未填日期'}
          <span className="ml-2 text-xs text-fg-3">
            {activities.length} 个活动
          </span>
        </h2>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={onAddActivity}
        >
          <Plus className="h-3 w-3" />
          加活动
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const items = activities.filter((a) => a.slot === slot.value)
          return (
            <div key={slot.value} className="rounded-control glass-inset p-3">
              <div className="mb-2 text-xs font-medium text-fg-2">
                {slot.label}
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-fg-3">（无活动）</div>
              ) : (
                <ul className="space-y-2">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      className="cursor-pointer rounded border border-line bg-white/5 p-2 hover:border-brand-500/50"
                      onClick={() => onEdit(a)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-fg-1">
                          {a.place || '（未填地点）'}
                        </div>
                        <div className="text-xs text-fg-3">
                          {TYPE_LABELS[a.type]}
                        </div>
                      </div>
                      {a.time && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-fg-2">
                          <Clock className="h-3 w-3" />
                          {a.time}
                        </div>
                      )}
                      {a.note && (
                        <p className="mt-1 text-xs text-fg-2 line-clamp-2">
                          {a.note}
                        </p>
                      )}
                      {/* 跨模块关联：点击图标跳转到对应模块并高亮 */}
                      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-fg-3">
                        {a.linkedTransportIds.map((tid) => (
                          <Link
                            key={tid}
                            to={`/transports?highlight=${tid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded bg-white/8 px-1 py-0.5 text-fg-2 hover:bg-brand-500/20 hover:text-brand-300"
                            aria-label="跳转交通"
                            data-link-transport={tid}
                          >
                            <Train className="h-3 w-3" />
                          </Link>
                        ))}
                        {a.linkedExpenseIds.map((eid) => (
                          <Link
                            key={eid}
                            to={`/expenses?highlight=${eid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded bg-white/8 px-1 py-0.5 text-fg-2 hover:bg-brand-500/20 hover:text-brand-300"
                            aria-label="跳转消费"
                            data-link-expense={eid}
                          >
                            <Wallet className="h-3 w-3" />
                          </Link>
                        ))}
                        {a.linkedGuideIds.map((gid) => (
                          <Link
                            key={gid}
                            to={`/guides?highlight=${gid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded bg-white/8 px-1 py-0.5 text-fg-2 hover:bg-brand-500/20 hover:text-brand-300"
                            aria-label="跳转攻略"
                            data-link-guide={gid}
                          >
                            <BookOpen className="h-3 w-3" />
                          </Link>
                        ))}
                        {a.linkedTransportIds.length === 0 &&
                          a.linkedExpenseIds.length === 0 &&
                          a.linkedGuideIds.length === 0 && (
                            <span className="text-[10px] text-white/25">
                              无关联
                            </span>
                          )}
                        <button
                          type="button"
                          className="ml-auto text-danger hover:text-danger/80"
                          onClick={(e) => {
                            e.stopPropagation()
                            openConfirm({
                              title: '删除活动',
                              message: `删除活动「${a.place || '未命名'}」？`,
                              confirmLabel: '删除',
                              danger: true,
                              onConfirm: () => crud.removeActivity(a.id),
                            })
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

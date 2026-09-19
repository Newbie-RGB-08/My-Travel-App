import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { MapPin, Plane, Wallet, BookOpen, ChevronRight } from 'lucide-react'

import { db } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/pages/Trips/TripCard'
import { TRANSPORT_META, STATUS_META } from '@/pages/Transports/TransportCard'
import { CATEGORY_META } from '@/pages/Expenses/ExpenseCard'
import { formatDateRange, formatDateTime, formatMoney } from '@/utils/format'
import type { ExpenseCategory } from '@/types'

const UPCOMING_LIMIT = 5

export default function Home() {
  const { currentTripId } = useTripStore()
  const trip = useLiveQuery(
    () => (currentTripId ? db.trips.get(currentTripId) : undefined),
    [currentTripId],
  )
  const transports = useLiveQuery(
    () =>
      currentTripId
        ? db.transports.where('tripId').equals(currentTripId).toArray()
        : [],
    [currentTripId],
  ) ?? []
  const expenses = useLiveQuery(
    () =>
      currentTripId
        ? db.expenses.where('tripId').equals(currentTripId).toArray()
        : [],
    [currentTripId],
  ) ?? []
  const favGuides = useLiveQuery(() => crud.listFavoriteGuides(5), []) ?? []

  // 临近交通：今天及之后，按出发升序，取前 5
  const today = format(new Date(), "yyyy-MM-dd'T'00:00:00")
  const upcoming = useMemo(
    () =>
      transports
        .filter((t) => t.departAt >= today)
        .sort((a, b) => a.departAt.localeCompare(b.departAt))
        .slice(0, UPCOMING_LIMIT),
    [transports, today],
  )

  // 消费汇总
  const total = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  )
  const byCategory = useMemo(() => {
    const m: Record<ExpenseCategory, number> = {
      transport: 0,
      stay: 0,
      food: 0,
      ticket: 0,
      shop: 0,
      other: 0,
    }
    for (const e of expenses) m[e.category] += e.amount
    return m
  }, [expenses])

  const budget = trip?.budget ?? 0
  const remaining = budget - total
  const overspent = remaining < 0

  if (!currentTripId || !trip) {
    return (
      <div className="px-6 py-6">
        <PageHeader title="首页总览" />
        <div className="card">
          <EmptyState
            icon={<MapPin className="h-12 w-12" />}
            title="先创建一次行程吧"
            description="选择或新建一个行程后，首页会展示它的交通、消费、攻略摘要。"
            action={
              <Link to="/trips" className="btn-primary">
                去创建行程
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="首页总览"
        subtitle={
          <span className="text-xs text-gray-500">
            当前行程：{trip.name}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 区块1：行程概况 */}
        <section className="card p-5" data-home-block="trip">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-brand-500" />
              行程概况
            </h2>
            <Link
              to="/trips"
              className="inline-flex items-center text-xs text-brand-600 hover:underline"
              aria-label="查看全部行程"
            >
              查看全部
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{trip.name}</h3>
            <StatusBadge status={trip.status} />
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {trip.destination || '未填目的地'}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            {formatDateRange(trip.startDate, trip.endDate)}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">预算</span>
              <span className="font-medium text-gray-900">
                {formatMoney(budget)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-gray-500">已花费</span>
              <span className="font-medium text-gray-900">{formatMoney(total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-gray-500">剩余</span>
              <span
                className={`font-medium ${overspent ? 'text-red-600' : 'text-green-600'}`}
              >
                {formatMoney(remaining)}
              </span>
            </div>
          </div>
        </section>

        {/* 区块2：临近交通 */}
        <section className="card p-5" data-home-block="transports">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Plane className="h-4 w-4 text-brand-500" />
              临近交通
            </h2>
            <Link
              to="/transports"
              className="inline-flex items-center text-xs text-brand-600 hover:underline"
              aria-label="查看全部交通安排"
            >
              查看全部
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">
              暂无临近交通安排
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((t) => {
                const meta = TRANSPORT_META[t.type]
                const s = STATUS_META[t.status]
                const highlight = t.status === 'pending'
                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                      highlight ? 'bg-amber-50' : ''
                    }`}
                    data-transport-id={t.id}
                    data-transport-status={t.status}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-gray-900">
                          {t.from || '—'} → {t.to || '—'}
                        </span>
                        {t.no && (
                          <span className="truncate text-xs text-gray-500">
                            {t.no}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDateTime(t.departAt)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}
                    >
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* 区块3：消费汇总 */}
        <section className="card p-5" data-home-block="expenses">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Wallet className="h-4 w-4 text-brand-500" />
              消费汇总
            </h2>
            <Link
              to="/expenses"
              className="inline-flex items-center text-xs text-brand-600 hover:underline"
              aria-label="查看全部消费记录"
            >
              查看全部
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400">总花费</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMoney(total)}
              </p>
            </div>
            {budget > 0 && (
              <p className="text-xs text-gray-400">
                预算 {formatMoney(budget)} · {Math.min(100, budget > 0 ? (total / budget) * 100 : 0).toFixed(0)}%
              </p>
            )}
          </div>
          {/* 分类占比小图：堆叠条 */}
          {total > 0 ? (
            <div
              className="mt-3 flex h-3 w-full overflow-hidden rounded-full"
              data-testid="expense-bar"
            >
              {(Object.keys(byCategory) as ExpenseCategory[])
                .filter((k) => byCategory[k] > 0)
                .map((k) => {
                  const c = CATEGORY_META[k]
                  const pct = (byCategory[k] / total) * 100
                  return (
                    <div
                      key={k}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: c.color,
                      }}
                      title={`${c.label} ${formatMoney(byCategory[k])}`}
                      data-category={k}
                    />
                  )
                })}
            </div>
          ) : (
            <p className="mt-3 text-center text-xs text-gray-400">暂无消费</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
            {(Object.keys(byCategory) as ExpenseCategory[])
              .filter((k) => byCategory[k] > 0)
              .map((k) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_META[k].color }}
                  />
                  {CATEGORY_META[k].label}
                </span>
              ))}
          </div>
        </section>

        {/* 区块4：收藏攻略 */}
        <section className="card p-5" data-home-block="guides">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <BookOpen className="h-4 w-4 text-brand-500" />
              收藏攻略
            </h2>
            <Link
              to="/guides"
              className="inline-flex items-center text-xs text-brand-600 hover:underline"
              aria-label="查看全部攻略"
            >
              查看全部
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {favGuides.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">
              暂无收藏攻略
            </p>
          ) : (
            <ul className="space-y-1.5">
              {favGuides.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <span className="text-base">⭐</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-gray-900">
                      {g.title}
                    </span>
                    {g.destination && (
                      <span className="block truncate text-[10px] text-gray-400">
                        {g.destination}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

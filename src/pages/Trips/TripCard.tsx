import type { Trip, TripStatus } from '@/types'
import { formatDateRange, formatMoney } from '@/utils/format'

const STATUS_BADGE: Record<TripStatus, { label: string; cls: string }> = {
  planning: { label: '计划中', cls: 'bg-gray-100 text-gray-600' },
  ongoing: { label: '进行中', cls: 'bg-brand-100 text-brand-700' },
  done: { label: '已完成', cls: 'bg-green-100 text-green-700' },
}

export function StatusBadge({ status }: { status: TripStatus }) {
  const s = STATUS_BADGE[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  )
}

interface TripCardProps {
  trip: Trip
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  active?: boolean
}

export function TripCard({
  trip,
  onClick,
  onEdit,
  onDelete,
  active,
}: TripCardProps) {
  return (
    <div
      className={`card card-hover cursor-pointer p-4 ${
        active ? 'ring-2 ring-brand-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {trip.name}
            </h3>
            <StatusBadge status={trip.status} />
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {trip.destination || '未填目的地'}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {formatDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              type="button"
              className="btn-ghost p-1"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              aria-label="编辑行程"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn-ghost p-1 text-red-500 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label="删除行程"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        预算 {formatMoney(trip.budget, 'CNY')}
        {trip.companions.length > 0 && (
          <span className="ml-3">同行 · {trip.companions.join('、')}</span>
        )}
      </div>
    </div>
  )
}

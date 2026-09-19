import { Pencil, Trash2 } from 'lucide-react'
import type { Transport, TransportStatus, TransportType } from '@/types'
import { formatDateTime } from '@/utils/format'

export const TRANSPORT_META: Record<
  TransportType,
  { label: string; icon: string }
> = {
  flight: { label: '航班', icon: '✈️' },
  train: { label: '火车', icon: '🚄' },
  bus: { label: '大巴', icon: '🚌' },
  metro: { label: '地铁', icon: '🚇' },
  taxi: { label: '出租', icon: '🚕' },
  self: { label: '自驾', icon: '🚗' },
}

export const STATUS_META: Record<
  TransportStatus,
  { label: string; cls: string }
> = {
  pending: { label: '待出行', cls: 'bg-amber-100 text-amber-700' },
  done: { label: '已完成', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500 line-through' },
}

export const STATUS_OPTIONS: TransportStatus[] = ['pending', 'done', 'cancelled']

interface TransportCardProps {
  transport: Transport
  onEdit?: () => void
  onDelete?: () => void
  onStatusChange?: (status: TransportStatus) => void
  highlight?: boolean
}

export function TransportCard({
  transport,
  onEdit,
  onDelete,
  onStatusChange,
  highlight,
}: TransportCardProps) {
  const t = TRANSPORT_META[transport.type]
  const s = STATUS_META[transport.status]

  return (
    <div
      className={`card card-hover p-4 ${highlight ? 'ring-2 ring-brand-500' : ''}`}
      data-transport-id={transport.id}
      data-transport-type={transport.type}
      data-transport-status={transport.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {t.icon}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {t.label}
            </span>
            {transport.no && (
              <span className="text-sm font-semibold text-gray-900">
                {transport.no}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}
            >
              {s.label}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-900">
            <span className="truncate">{transport.from || '—'}</span>
            <span className="text-gray-400">→</span>
            <span className="truncate">{transport.to || '—'}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              出发 <time>{formatDateTime(transport.departAt)}</time>
            </span>
            {transport.arriveAt && (
              <span>
                到达 <time>{formatDateTime(transport.arriveAt)}</time>
              </span>
            )}
            {transport.seat && <span>座位 {transport.seat}</span>}
            {transport.terminal && <span>{transport.terminal}</span>}
            {transport.checkinInfo && <span>{transport.checkinInfo}</span>}
          </div>
          {transport.note && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
              {transport.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              type="button"
              className="btn-ghost p-1"
              onClick={onEdit}
              aria-label="编辑交通安排"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn-ghost p-1 text-red-500 hover:bg-red-50"
              onClick={onDelete}
              aria-label="删除交通安排"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {onStatusChange && (
        <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
          <span className="mr-1 text-xs text-gray-400">状态</span>
          {STATUS_OPTIONS.map((opt) => {
            const meta = STATUS_META[opt]
            const active = transport.status === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onStatusChange(opt)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                  active
                    ? meta.cls
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
                aria-pressed={active}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

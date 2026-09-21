import {
  Pencil,
  Trash2,
  Plane,
  TrainFront,
  Bus,
  TramFront,
  CarTaxiFront,
  Car,
  type LucideIcon,
} from 'lucide-react'
import type { Transport, TransportStatus, TransportType } from '@/types'
import { formatDateTime } from '@/utils/format'

export const TRANSPORT_META: Record<
  TransportType,
  { label: string; icon: LucideIcon }
> = {
  flight: { label: '航班', icon: Plane },
  train: { label: '火车', icon: TrainFront },
  bus: { label: '大巴', icon: Bus },
  metro: { label: '地铁', icon: TramFront },
  taxi: { label: '出租', icon: CarTaxiFront },
  self: { label: '自驾', icon: Car },
}

export const STATUS_META: Record<
  TransportStatus,
  { label: string; tone: 'warn' | 'ok' | 'neutral'; strike?: boolean }
> = {
  pending: { label: '待出行', tone: 'warn' },
  done: { label: '已完成', tone: 'ok' },
  cancelled: { label: '已取消', tone: 'neutral', strike: true },
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
  const TIcon = t.icon

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
            <TIcon className="h-4 w-4 shrink-0 text-fg-2" />
            <span className="text-xs font-medium text-fg-2">
              {t.label}
            </span>
            {transport.no && (
              <span className="text-sm font-semibold text-fg-1">
                {transport.no}
              </span>
            )}
            <span
              className={`badge ${s.strike ? 'line-through' : ''}`}
              data-tone={s.tone}
            >
              {s.label}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-fg-1">
            <span className="truncate">{transport.from || '—'}</span>
            <span className="text-fg-3">→</span>
            <span className="truncate">{transport.to || '—'}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-2">
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
            <p className="mt-1 text-xs text-fg-2 line-clamp-2">
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
              className="btn-ghost p-1 text-danger hover:bg-danger/10"
              onClick={onDelete}
              aria-label="删除交通安排"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {onStatusChange && (
        <div className="mt-3 flex items-center gap-1 border-t border-line-soft pt-2">
          <span className="mr-1 text-xs text-fg-3">状态</span>
          {STATUS_OPTIONS.map((opt) => {
            const meta = STATUS_META[opt]
            const active = transport.status === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onStatusChange(opt)}
                className={
                  active
                    ? 'badge'
                    : 'rounded px-2 py-0.5 text-xs font-medium text-fg-3 transition-colors hover:bg-white/10'
                }
                data-tone={active ? meta.tone : undefined}
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

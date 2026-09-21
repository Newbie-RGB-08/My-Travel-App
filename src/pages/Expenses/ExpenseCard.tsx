import {
  Pencil,
  Trash2,
  TrainFront,
  BedDouble,
  UtensilsCrossed,
  Ticket,
  ShoppingBag,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { Expense, ExpenseCategory } from '@/types'
import { formatDateTime, formatMoney } from '@/utils/format'

export const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; color: string; icon: LucideIcon }
> = {
  transport: { label: '交通', color: '#0A84FF', icon: TrainFront },
  stay: { label: '住宿', color: '#BF5AF2', icon: BedDouble },
  food: { label: '餐饮', color: '#FF9F0A', icon: UtensilsCrossed },
  ticket: { label: '门票', color: '#30D158', icon: Ticket },
  shop: { label: '购物', color: '#FF375F', icon: ShoppingBag },
  other: { label: '其他', color: '#98989F', icon: Receipt },
}

interface ExpenseCardProps {
  expense: Expense
  onEdit?: () => void
  onDelete?: () => void
  highlight?: boolean
}

export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  highlight,
}: ExpenseCardProps) {
  const c = CATEGORY_META[expense.category]
  const CIcon = c.icon
  return (
    <div
      className={`card card-hover p-4 ${highlight ? 'ring-2 ring-brand-500' : ''}`}
      data-expense-id={expense.id}
      data-expense-category={expense.category}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CIcon className="h-4 w-4 shrink-0" style={{ color: c.color }} />
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${c.color}26`, color: c.color }}
            >
              {c.label}
            </span>
            <span className="text-sm font-semibold text-fg-1">
              {formatMoney(expense.amount, expense.currency)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-2">
            <span>
              <time>{formatDateTime(expense.time)}</time>
            </span>
            {expense.place && <span>{expense.place}</span>}
          </div>
          {expense.note && (
            <p className="mt-1 text-xs text-fg-2 line-clamp-2">
              {expense.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              type="button"
              className="btn-ghost p-1"
              onClick={onEdit}
              aria-label="编辑消费记录"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn-ghost p-1 text-danger hover:bg-danger/10"
              onClick={onDelete}
              aria-label="删除消费记录"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

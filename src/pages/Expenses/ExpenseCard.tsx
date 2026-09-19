import { Pencil, Trash2 } from 'lucide-react'
import type { Expense, ExpenseCategory } from '@/types'
import { formatDateTime, formatMoney } from '@/utils/format'

export const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; color: string; icon: string }
> = {
  transport: { label: '交通', color: '#3b82f6', icon: '🚆' },
  stay: { label: '住宿', color: '#8b5cf6', icon: '🏨' },
  food: { label: '餐饮', color: '#f59e0b', icon: '🍜' },
  ticket: { label: '门票', color: '#10b981', icon: '🎟️' },
  shop: { label: '购物', color: '#ec4899', icon: '🛍️' },
  other: { label: '其他', color: '#6b7280', icon: '💸' },
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
  return (
    <div
      className={`card card-hover p-4 ${highlight ? 'ring-2 ring-brand-500' : ''}`}
      data-expense-id={expense.id}
      data-expense-category={expense.category}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              {c.icon}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${c.color}22`, color: c.color }}
            >
              {c.label}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatMoney(expense.amount, expense.currency)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              <time>{formatDateTime(expense.time)}</time>
            </span>
            {expense.place && <span>{expense.place}</span>}
          </div>
          {expense.note && (
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
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
              className="btn-ghost p-1 text-red-500 hover:bg-red-50"
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

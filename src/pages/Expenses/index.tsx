import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Plus, Wallet } from 'lucide-react'

import { db } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { ExpenseCard, CATEGORY_META } from './ExpenseCard'
import { ExpenseFormModal } from './ExpenseFormModal'
import { formatMoney } from '@/utils/format'
import type { ExpenseCategory, NewExpense, Expense } from '@/types'
import { CATEGORY_OPTIONS } from './ExpenseFormModal'

const ALL = '__all__' as const

export default function Expenses() {
  const { currentTripId } = useTripStore()
  const { openConfirm } = useModalStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | typeof ALL>(ALL)

  const currentTrip = useLiveQuery(
    () => (currentTripId ? db.trips.get(currentTripId) : undefined),
    [currentTripId],
  )

  const expenses = useLiveQuery(
    () =>
      currentTripId
        ? db.expenses.where('tripId').equals(currentTripId).toArray()
        : db.expenses.toArray(),
    [currentTripId],
  ) ?? []

  // 按时间倒序
  const sorted = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const ta = a.time || ''
        const tb = b.time || ''
        return tb.localeCompare(ta)
      }),
    [expenses],
  )

  const filtered = useMemo(
    () =>
      categoryFilter === ALL
        ? sorted
        : sorted.filter((e) => e.category === categoryFilter),
    [sorted, categoryFilter],
  )

  // 汇总
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

  const pieData = useMemo(
    () =>
      (Object.keys(byCategory) as ExpenseCategory[])
        .map((k) => ({
          name: CATEGORY_META[k].label,
          value: byCategory[k],
          color: CATEGORY_META[k].color,
          key: k,
        }))
        .filter((d) => d.value > 0),
    [byCategory],
  )

  const budget = currentTrip?.budget ?? 0
  const remaining = budget - total
  const overspent = remaining < 0
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0

  const [modal, setModal] = useState<{ open: boolean; initial: Expense | null }>({
    open: false,
    initial: null,
  })

  const clearHighlight = () => {
    if (highlightId) setSearchParams({}, { replace: true })
  }
  const handleAdd = () => {
    clearHighlight()
    setModal({ open: true, initial: null })
  }
  const handleEdit = (e: Expense) => {
    clearHighlight()
    setModal({ open: true, initial: e })
  }
  const handleDelete = (e: Expense) => {
    openConfirm({
      title: '删除消费记录',
      message: `删除「${formatMoney(e.amount)} · ${CATEGORY_META[e.category].label}」？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => crud.removeExpense(e.id),
    })
  }

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="消费记录"
        subtitle={
          currentTrip ? (
            <span className="text-xs text-gray-500">
              行程「{currentTrip.name}」· 共 {expenses.length} 条
            </span>
          ) : (
            <span className="text-xs text-gray-500">
              未选行程，显示全部 {expenses.length} 条
            </span>
          )
        }
        actions={
          <button type="button" className="btn-primary" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            新建消费
          </button>
        }
      />

      {/* 汇总区 */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">总花费</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {formatMoney(total)}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {expenses.length} 条记录
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">预算 vs 实际</div>
          {budget > 0 ? (
            <>
              <div className="mt-1 flex items-baseline gap-2 text-sm">
                <span className="font-semibold text-gray-900">
                  {formatMoney(total)}
                </span>
                <span className="text-gray-400">/ {formatMoney(budget)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${overspent ? 'bg-red-500' : 'bg-brand-500'}`}
                  style={{ width: `${pct}%` }}
                  aria-label="消费进度"
                />
              </div>
              <div
                className={`mt-2 text-xs ${overspent ? 'text-red-600' : 'text-gray-500'}`}
              >
                {overspent
                  ? `超支 ${formatMoney(Math.abs(remaining))}`
                  : `剩余 ${formatMoney(remaining)}`}
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-gray-400">
              {currentTripId
                ? '该行程未设预算'
                : '未选择行程，无法对比预算'}
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">分类占比</div>
          {pieData.length === 0 ? (
            <div className="mt-3 text-xs text-gray-400">暂无数据</div>
          ) : (
            <div className="mt-1 flex items-center gap-3">
              <div className="h-20 w-20" aria-label="分类占比饼图">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="100%"
                      paddingAngle={2}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [formatMoney(v), n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1 text-xs">
                {pieData.map((d) => (
                  <li key={d.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-600">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      {d.name}
                    </span>
                    <span className="text-gray-900">{formatMoney(d.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 分类筛选 */}
      {expenses.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">分类</span>
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-xs ${
              categoryFilter === ALL
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setCategoryFilter(ALL)}
          >
            全部
          </button>
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`rounded px-2 py-0.5 text-xs ${
                categoryFilter === c.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setCategoryFilter(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Wallet className="h-12 w-12" />}
            title="还没有消费记录"
            description="记一笔花费，自动按分类汇总，对比预算花在哪。"
            action={
              <button type="button" className="btn-primary" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                创建第一条消费记录
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <ExpenseCard
              key={e.id}
              expense={e}
              highlight={highlightId === e.id}
              onEdit={() => handleEdit(e)}
              onDelete={() => handleDelete(e)}
            />
          ))}
        </div>
      )}

      <ExpenseFormModal
        key={modal.initial?.id ?? 'new-expense'}
        open={modal.open}
        initial={modal.initial}
        defaultTripId={currentTripId}
        onClose={() => setModal({ open: false, initial: null })}
        onSubmit={async (data: NewExpense) => {
          if (modal.initial) {
            await crud.updateExpense(modal.initial.id, data)
          } else {
            await crud.addExpense(data)
          }
        }}
      />
    </div>
  )
}

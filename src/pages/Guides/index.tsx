import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { Plus, BookOpen } from 'lucide-react'

import { db } from '@/db/schema'
import { ownerAll, ownerByTrip } from '@/db/scope'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { GuideCard, CATEGORY_META } from './GuideCard'
import { GuideFormModal } from './GuideFormModal'
import { CATEGORY_OPTIONS } from './GuideFormModal'
import type { Guide, GuideCategory, NewGuide } from '@/types'

const ALL = '__all__' as const

export default function Guides() {
  const { currentTripId } = useTripStore()
  const { openConfirm } = useModalStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [categoryFilter, setCategoryFilter] = useState<GuideCategory | typeof ALL>(ALL)
  const [destFilter, setDestFilter] = useState<string>('')

  const guides = useLiveQuery(
    () =>
      currentTripId
        ? ownerByTrip(db.guides, currentTripId)
        : ownerAll(db.guides),
    [currentTripId],
  ) ?? []

  // 按创建时间倒序
  const sorted = useMemo(
    () => [...guides].sort((a, b) => b.createdAt - a.createdAt),
    [guides],
  )

  // 目的地选项（当前数据集中出现过的）
  const destinations = useMemo(() => {
    const s = new Set<string>()
    for (const g of guides) if (g.destination) s.add(g.destination)
    return Array.from(s).sort()
  }, [guides])

  const filtered = useMemo(() => {
    return sorted.filter((g) => {
      if (categoryFilter !== ALL && g.category !== categoryFilter) return false
      if (destFilter && g.destination !== destFilter) return false
      return true
    })
  }, [sorted, categoryFilter, destFilter])

  const [modal, setModal] = useState<{ open: boolean; initial: Guide | null }>({
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
  const handleEdit = (g: Guide) => {
    clearHighlight()
    setModal({ open: true, initial: g })
  }
  const handleDelete = (g: Guide) => {
    openConfirm({
      title: '删除攻略',
      message: `删除攻略「${g.title}」？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => crud.removeGuide(g.id),
    })
  }
  const handleToggleFavorite = async (g: Guide) => {
    await crud.updateGuide(g.id, { favorite: !g.favorite })
  }

  const favoriteCount = guides.filter((g) => g.favorite).length

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="游玩攻略"
        subtitle={
          <span className="text-xs text-fg-2">
            {currentTripId
              ? `本行程攻略 ${guides.length} 条`
              : `未选行程，显示全部 ${guides.length} 条`}
            {favoriteCount > 0 && ` · 收藏 ${favoriteCount} 条`}
          </span>
        }
        actions={
          <button type="button" className="btn-primary" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            新建攻略
          </button>
        }
      />

      {/* 筛选 */}
      {guides.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-fg-3">分类</span>
            <button
              type="button"
              className={`chip ${categoryFilter === ALL ? 'chip-active' : ''}`}
              onClick={() => setCategoryFilter(ALL)}
            >
              全部
            </button>
            {CATEGORY_OPTIONS.map((c) => {
              const CIcon = CATEGORY_META[c.value].icon
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`chip ${
                    categoryFilter === c.value ? 'chip-active' : ''
                  }`}
                  onClick={() => setCategoryFilter(c.value)}
                >
                  <CIcon className="h-3 w-3" />
                  {c.label}
                </button>
              )
            })}
          </div>
          {destinations.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-fg-3">目的地</span>
              <select
                className="input max-w-[160px] py-0.5 text-xs"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
              >
                <option value="">全部</option>
                {destinations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="还没有攻略"
            description="收集景点、美食、避坑经验，正文支持粘贴截图存图。"
            action={
              <button type="button" className="btn-primary" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                创建第一条攻略
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <GuideCard
              key={g.id}
              guide={g}
              highlight={highlightId === g.id}
              onEdit={() => handleEdit(g)}
              onDelete={() => handleDelete(g)}
              onToggleFavorite={() => handleToggleFavorite(g)}
            />
          ))}
        </div>
      )}

      <GuideFormModal
        key={modal.initial?.id ?? 'new-guide'}
        open={modal.open}
        initial={modal.initial}
        defaultTripId={currentTripId}
        onClose={() => setModal({ open: false, initial: null })}
        onSubmit={async (data: NewGuide) => {
          if (modal.initial) {
            await crud.updateGuide(modal.initial.id, data)
          } else {
            await crud.addGuide(data)
          }
        }}
      />
    </div>
  )
}

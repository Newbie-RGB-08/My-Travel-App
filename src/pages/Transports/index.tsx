import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { Plus, Train } from 'lucide-react'

import { db } from '@/db/schema'
import { ownerAll, ownerByTrip } from '@/db/scope'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { TransportCard } from './TransportCard'
import { TransportFormModal } from './TransportFormModal'
import type { NewTransport, Transport } from '@/types'

export default function Transports() {
  const { currentTripId } = useTripStore()
  const { openConfirm } = useModalStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const transports = useLiveQuery(
    () =>
      currentTripId
        ? ownerByTrip(db.transports, currentTripId)
        : ownerAll(db.transports),
    [currentTripId],
  ) ?? []

  const sorted = useMemo(
    () =>
      [...transports].sort((a, b) => {
        // departAt 为空时排到最后
        const da = a.departAt || ''
        const db = b.departAt || ''
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.localeCompare(db)
      }),
    [transports],
  )

  const [modal, setModal] = useState<{ open: boolean; initial: Transport | null }>({
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

  const handleEdit = (t: Transport) => {
    clearHighlight()
    setModal({ open: true, initial: t })
  }

  const handleDelete = (t: Transport) => {
    openConfirm({
      title: '删除交通安排',
      message: `删除交通安排「${t.no || t.from + ' → ' + t.to}」？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => crud.removeTransport(t.id),
    })
  }

  const handleStatusChange = async (id: string, status: Transport['status']) => {
    await crud.updateTransport(id, { status })
  }

  const pendingCount = sorted.filter((t) => t.status === 'pending').length

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="交通安排"
        subtitle={
          currentTripId ? (
            <span className="text-xs text-fg-2">
              共 {sorted.length} 条 · 待出行 {pendingCount} 条
            </span>
          ) : (
            <span className="text-xs text-fg-2">
              未选行程，显示全部 {sorted.length} 条 · 待出行 {pendingCount} 条
            </span>
          )
        }
        actions={
          <button type="button" className="btn-primary" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            新建交通
          </button>
        }
      />

      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Train className="h-12 w-12" />}
            title="还没有交通安排"
            description="添加航班、火车、大巴等班次信息，出行前一目了然。"
            action={
              <button type="button" className="btn-primary" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
                创建第一条交通安排
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((t) => (
            <TransportCard
              key={t.id}
              transport={t}
              highlight={highlightId === t.id}
              onEdit={() => handleEdit(t)}
              onDelete={() => handleDelete(t)}
              onStatusChange={(s) => handleStatusChange(t.id, s)}
            />
          ))}
        </div>
      )}

      <TransportFormModal
        key={modal.initial?.id ?? 'new-transport'}
        open={modal.open}
        initial={modal.initial}
        defaultTripId={currentTripId}
        onClose={() => setModal({ open: false, initial: null })}
        onSubmit={async (data: NewTransport) => {
          if (modal.initial) {
            await crud.updateTransport(modal.initial.id, data)
          } else {
            await crud.addTransport(data)
          }
        }}
      />
    </div>
  )
}

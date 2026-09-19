import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapPin, Plus, Pencil, Trash2, Route as RouteIcon, X } from 'lucide-react'

import { db } from '@/db/schema'
import * as crud from '@/db/crud'
import { useTripStore } from '@/store/useTripStore'
import { useModalStore } from '@/store/useModalStore'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { MapView } from './MapView'
import { MarkFormModal } from './MarkFormModal'
import { TILE_SOURCES, type TileSourceKey } from './tiles'
import type { MapMark, MapMarkType, NewMapMark, Route } from '@/types'

const MARK_TYPE_ICON: Record<MapMarkType, string> = {
  sight: '🏛️',
  hotel: '🏨',
  food: '🍜',
  station: '🚉',
  custom: '📍',
}

const MARK_TYPE_LABEL: Record<MapMarkType, string> = {
  sight: '景点',
  hotel: '酒店',
  food: '美食',
  station: '车站',
  custom: '自定义',
}

interface MarkModalState {
  open: boolean
  initial: MapMark | null
  lat?: number
  lng?: number
}

export default function MapViewPage() {
  const { currentTripId } = useTripStore()
  const { openConfirm } = useModalStore()
  const [tileKey, setTileKey] = useState<TileSourceKey>('gaode')
  const [offline, setOffline] = useState(false)
  // 当前需飞行定位的标注坐标（点击列表项触发）
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null)
  const [markModal, setMarkModal] = useState<MarkModalState>({
    open: false,
    initial: null,
  })
  // 路线编辑模式：选择多个标注按顺序连线
  const [routeMode, setRouteMode] = useState(false)
  const [routeSelection, setRouteSelection] = useState<string[]>([])
  const [routeName, setRouteName] = useState('')

  const marks = useLiveQuery(
    () =>
      currentTripId
        ? db.mapMarks.where('tripId').equals(currentTripId).toArray()
        : db.mapMarks.toArray(),
    [currentTripId],
  ) ?? []

  const routes = useLiveQuery(
    () =>
      currentTripId
        ? db.routes.where('tripId').equals(currentTripId).toArray()
        : db.routes.toArray(),
    [currentTripId],
  ) ?? []

  const sortedMarks = useMemo(
    () => [...marks].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [marks],
  )

  const handleMapClick = (lat: number, lng: number) => {
    // 路线模式下不直接新建标注，避免误触
    if (routeMode) return
    setMarkModal({ open: true, initial: null, lat, lng })
  }

  const handleAddMark = () => {
    setMarkModal({ open: true, initial: null })
  }

  const handleEditMark = (m: MapMark) => {
    setMarkModal({ open: true, initial: m })
  }

  const handleDeleteMark = (m: MapMark) => {
    openConfirm({
      title: '删除标注',
      message: `删除标注「${m.name}」？关联路线会自动移除该点。`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => crud.removeMapMark(m.id),
    })
  }

  const handleSelectMark = (m: MapMark) => {
    // 点击列表项 → 地图飞行定位
    setFocus({ lat: m.lat, lng: m.lng })
  }

  // 路线选择：点击 +/✓ 把标注加入/移出选择序列
  const toggleRoutePick = (id: string) => {
    setRouteSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSaveRoute = async () => {
    const name = routeName.trim() || `路线 ${routeSelection.length} 点`
    if (routeSelection.length < 2) return
    await crud.addRoute({
      name,
      markIds: routeSelection,
      tripId: currentTripId,
    })
    setRouteSelection([])
    setRouteName('')
    setRouteMode(false)
  }

  const handleCancelRoute = () => {
    setRouteSelection([])
    setRouteName('')
    setRouteMode(false)
  }

  const handleDeleteRoute = (r: Route) => {
    openConfirm({
      title: '删除路线',
      message: `删除路线「${r.name}」？`,
      confirmLabel: '删除',
      danger: true,
      onConfirm: () => crud.removeRoute(r.id),
    })
  }

  const submitMark = async (data: NewMapMark) => {
    if (markModal.initial) {
      await crud.updateMapMark(markModal.initial.id, data)
    } else {
      await crud.addMapMark(data)
    }
  }

  const selectedMarks = routeSelection
    .map((id) => marks.find((m) => m.id === id))
    .filter((m): m is MapMark => !!m)

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6">
        <PageHeader
          title="地图详情"
          subtitle={
            <span className="text-xs text-gray-500">
              {currentTripId
                ? `本行程标注 ${marks.length} 个 · 路线 ${routes.length} 条`
                : `未选行程，显示全部 ${marks.length} 个标注`}
              {offline && ' · 地图需联网，左侧列表仍可查看'}
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              {/* 瓦片源切换 */}
              <select
                className="input max-w-[140px] py-1 text-xs"
                value={tileKey}
                onChange={(e) => setTileKey(e.target.value as TileSourceKey)}
                aria-label="瓦片源"
              >
                {Object.values(TILE_SOURCES).map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={
                  routeMode
                    ? 'btn-secondary'
                    : 'btn-ghost border border-gray-200'
                }
                onClick={() => setRouteMode((v) => !v)}
                aria-pressed={routeMode}
              >
                <RouteIcon className="h-4 w-4" />
                {routeMode ? '退出选择' : '画路线'}
              </button>
              <button type="button" className="btn-primary" onClick={handleAddMark}>
                <Plus className="h-4 w-4" />
                添加标注
              </button>
            </div>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
        {/* 左侧：标注列表 + 路线 */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
          <section className="card flex flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">标注</h2>
              <span className="text-xs text-gray-400">{marks.length}</span>
            </div>
            {sortedMarks.length === 0 ? (
              <EmptyState
                icon={<MapPin className="h-12 w-12" />}
                title="还没有标注"
                description="在地图上点击或点上方按钮添加标注。"
              />
            ) : (
              <ul className="space-y-1">
                {sortedMarks.map((m, idx) => {
                  const pickedIdx = routeSelection.indexOf(m.id)
                  const picked = pickedIdx >= 0
                  return (
                    <li
                      key={m.id}
                      data-mark-id={m.id}
                      data-mark-type={m.type}
                      className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                    >
                      {routeMode && (
                        <button
                          type="button"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium ${
                            picked
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-gray-300 text-gray-400'
                          }`}
                          onClick={() => toggleRoutePick(m.id)}
                          aria-label={picked ? '移出路线' : '加入路线'}
                        >
                          {picked ? pickedIdx + 1 : '+'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => handleSelectMark(m)}
                      >
                        <span className="text-base" aria-hidden="true">
                          {MARK_TYPE_ICON[m.type]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-800">
                            {m.name}
                          </span>
                          <span className="block truncate text-[10px] text-gray-400">
                            {MARK_TYPE_LABEL[m.type]} · {m.lat.toFixed(4)},{m.lng.toFixed(4)}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          className="btn-ghost p-1"
                          onClick={() => handleEditMark(m)}
                          aria-label="编辑标注"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1 text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteMark(m)}
                          aria-label="删除标注"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* 路线选择面板 */}
          {routeMode && (
            <section className="card flex flex-col gap-2 p-3" data-route-builder>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">路线选择</h2>
                <span className="text-xs text-gray-400">
                  已选 {routeSelection.length} 点
                </span>
              </div>
              {selectedMarks.length > 0 ? (
                <ol className="space-y-1 text-xs text-gray-600">
                  {selectedMarks.map((m, i) => (
                    <li key={m.id} className="flex items-center gap-1">
                      <span className="text-brand-500">{i + 1}.</span>
                      <span className="truncate">
                        {MARK_TYPE_ICON[m.type]} {m.name}
                      </span>
                      <button
                        type="button"
                        className="btn-ghost ml-auto p-0.5"
                        onClick={() => toggleRoutePick(m.id)}
                        aria-label={`移出 ${m.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-gray-400">
                  点击左侧标注前的 + 号，按顺序加入路线（至少 2 个点）。
                </p>
              )}
              <input
                type="text"
                className="input text-xs"
                placeholder="路线名称（可选）"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary flex-1 text-xs"
                  disabled={routeSelection.length < 2}
                  onClick={handleSaveRoute}
                >
                  生成路线
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={handleCancelRoute}
                >
                  取消
                </button>
              </div>
            </section>
          )}

          {/* 路线列表 */}
          {routes.length > 0 && (
            <section className="card flex flex-col p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">路线</h2>
                <span className="text-xs text-gray-400">{routes.length}</span>
              </div>
              <ul className="space-y-1">
                {routes.map((r) => (
                  <li
                    key={r.id}
                    data-route-id={r.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                  >
                    <RouteIcon className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-800">
                        {r.name}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {r.markIds.length} 点
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn-ghost p-1 text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteRoute(r)}
                      aria-label="删除路线"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* 右侧：地图 */}
        <div className="card relative min-w-0 flex-1 overflow-hidden">
          {offline ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MapPin className="mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">地图需联网</p>
              <p className="mt-1 text-xs text-gray-400">
                瓦片加载失败，左侧标注与路线列表仍可查看。
              </p>
              <button
                type="button"
                className="btn-secondary mt-3 text-xs"
                onClick={() => setOffline(false)}
              >
                重试
              </button>
            </div>
          ) : (
            <MapView
              marks={marks}
              routes={routes}
              focus={focus}
              onMapClick={handleMapClick}
              onTileError={() => setOffline(true)}
              tileKey={tileKey}
            />
          )}
        </div>
      </div>

      <MarkFormModal
        key={markModal.initial?.id ?? 'new-mark'}
        open={markModal.open}
        initial={markModal.initial}
        defaultLat={markModal.lat}
        defaultLng={markModal.lng}
        defaultTripId={currentTripId}
        onClose={() => setMarkModal({ open: false, initial: null })}
        onSubmit={submitMark}
      />
    </div>
  )
}

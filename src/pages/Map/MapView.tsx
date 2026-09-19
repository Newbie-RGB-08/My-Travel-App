import { useEffect, useMemo, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { TILE_SOURCES, type TileSourceKey } from './tiles'
import type { MapMark, MapMarkType, Route } from '@/types'

const MARK_ICON: Record<MapMarkType, string> = {
  sight: '🏛️',
  hotel: '🏨',
  food: '🍜',
  station: '🚉',
  custom: '📍',
}

function makeIcon(type: MapMarkType): L.DivIcon {
  return L.divIcon({
    className: 'map-mark-icon',
    html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${MARK_ICON[type]}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// 子组件：拿到 map 实例，按 focus 飞行定位
function MapController({ focus }: { focus: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 15), {
        duration: 0.6,
      })
    }
  }, [focus, map])
  return null
}

interface MapViewProps {
  marks: MapMark[]
  routes: Route[]
  focus: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
  onTileError: () => void
  tileKey: TileSourceKey
}

export function MapView({
  marks,
  routes,
  focus,
  onMapClick,
  onTileError,
  tileKey,
}: MapViewProps) {
  const tile = TILE_SOURCES[tileKey]
  const icons = useMemo(() => {
    const m = {} as Record<MapMarkType, L.DivIcon>
    ;(Object.keys(MARK_ICON) as MapMarkType[]).forEach((t) => {
      m[t] = makeIcon(t)
    })
    return m
  }, [])

  // 瓦片失败计数：连续多次失败才判定断网，避免单张瓦片抖动
  const errCountRef = useRef(0)

  // 路线 → polyline 坐标（按 markIds 顺序，找不到的悬挂 id 静默跳过）
  const routeLines = useMemo(() => {
    return routes.map((r) => ({
      id: r.id,
      name: r.name,
      coords: r.markIds
        .map((mid) => marks.find((m) => m.id === mid))
        .filter((m): m is MapMark => !!m)
        .map((m) => [m.lat, m.lng] as [number, number]),
    }))
  }, [routes, marks])

  return (
    <MapContainer
      center={[39.9042, 116.4074]}
      zoom={11}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
      eventHandlers={{
        click: (e: L.LeafletMouseEvent) => {
          onMapClick(e.latlng.lat, e.latlng.lng)
        },
      }}
    >
      <TileLayer
        url={tile.url}
        attribution={tile.attribution}
        subdomains={tile.subdomains ?? 'abc'}
        eventHandlers={{
          tileerror: () => {
            errCountRef.current += 1
            // 连续 3 次失败判定为断网降级
            if (errCountRef.current >= 3) {
              onTileError()
            }
          },
        }}
      />
      <MapController focus={focus} />
      {marks.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={icons[m.type]}>
          <Popup>
            <strong>{m.name}</strong>
            {m.note && <div style={{ maxWidth: 180 }}>{m.note}</div>}
          </Popup>
        </Marker>
      ))}
      {routeLines.map((rl) =>
        rl.coords.length >= 2 ? (
          <Polyline
            key={rl.id}
            positions={rl.coords}
            pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.7 }}
          />
        ) : null,
      )}
    </MapContainer>
  )
}

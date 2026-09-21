import { useEffect, useMemo, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import { TILE_SOURCES, type TileSourceKey } from './tiles'
import { MARK_META } from './markMeta'
import type { MapMark, MapMarkType, Route } from '@/types'

function makeIcon(type: MapMarkType): L.DivIcon {
  const meta = MARK_META[type]
  const Icon = meta.icon
  const svg = renderToStaticMarkup(
    <Icon width={14} height={14} strokeWidth={2.4} />,
  )
  return L.divIcon({
    className: 'map-mark-icon',
    html: `<span class="map-pin" style="--pin:${meta.hex}">${svg}</span>`,
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
    ;(Object.keys(MARK_META) as MapMarkType[]).forEach((t) => {
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

  // react-leaflet v4 的 MapContainer 类型未声明 eventHandlers；
  // 此处保持既有运行时传参不变，仅做类型层消解
  const containerEventProps = {
    eventHandlers: {
      click: (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng)
      },
    },
  } as unknown as Record<string, unknown>

  return (
    <MapContainer
      center={[39.9042, 116.4074]}
      zoom={11}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
      {...containerEventProps}
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
            pathOptions={{ color: '#0A84FF', weight: 3, opacity: 0.7 }}
          />
        ) : null,
      )}
    </MapContainer>
  )
}

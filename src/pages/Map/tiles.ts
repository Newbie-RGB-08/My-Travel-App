// 瓦片源封装：可一行切换。默认高德（国内细节好），备选 OSM。
// 切换时只需改 ACTIVE_TILE；也可由 UI 运行时切换（见 MapView 接收 tileKey）。
export type TileSourceKey = 'gaode' | 'osm'

export interface TileSource {
  key: TileSourceKey
  label: string
  url: string
  attribution: string
  subdomains?: string
}

export const TILE_SOURCES: Record<TileSourceKey, TileSource> = {
  gaode: {
    key: 'gaode',
    label: '高德瓦片',
    url: 'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    attribution: '© AutoNavi (高德)',
    subdomains: '1234',
  },
  osm: {
    key: 'osm',
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    subdomains: 'abc',
  },
}

// 默认激活的瓦片源（国内细节优先高德）
export const ACTIVE_TILE: TileSourceKey = 'gaode'

import type { MapMarkType } from '@/types'

// ===== 高德 Web服务 Key（密文存储，运行时解码） =====
// 明文 Key 不写入仓库、不落任何本地配置文件。
// 采用 XOR + Base64 可逆混淆：避免 APK 内明文 Key 被静态扫描直接提取，
// 并非密码学意义上的绝对加密（无后端代管时前端场景的常规做法）。
const ENC_KEY = 'CgpJR15dGV5ZWEQWT14CRxgWDFwIUBUWXFUfXwhSEhU='
const XOR_PASS = 'liquid-glass-map-poi'

let cachedKey = ''

/** 运行时解码高德 Web服务 Key（进程内缓存，不暴露到全局）。导出仅供单元测试比对，勿在业务代码中直接使用。 */
export function decodeAmapKey(): string {
  if (cachedKey) return cachedKey
  const raw = atob(ENC_KEY)
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    out += String.fromCharCode(
      raw.charCodeAt(i) ^ XOR_PASS.charCodeAt(i % XOR_PASS.length),
    )
  }
  cachedKey = out
  return out
}

/** 地点搜索结果（统一结构，供列表渲染与坐标回填） */
export interface PlaceResult {
  name: string
  address: string
  region: string
  lat: number
  lng: number
  markType: MapMarkType
}

interface AmapPoi {
  name?: string
  type?: string
  typecode?: string
  address?: string
  pname?: string
  cityname?: string
  adname?: string
  location?: string
}

interface AmapPlaceResponse {
  status: string
  pois?: AmapPoi[]
}

/** 按高德 POI 类别码推断标注类型（typecode 前两位为大类，细分子类同样命中） */
function inferMarkType(typecode?: string): MapMarkType {
  const tc = typecode ?? ''
  if (tc.startsWith('11')) return 'sight' // 风景名胜 110000 及子类
  if (tc.startsWith('10')) return 'hotel' // 住宿服务 100000 及子类
  if (tc.startsWith('05')) return 'food' // 餐饮服务 050000 及子类
  if (
    tc.startsWith('1501') || // 机场
    tc.startsWith('1504') || // 火车站
    tc.startsWith('1505') || // 地铁站
    tc.startsWith('1507') // 长途汽车站
  )
    return 'station'
  return 'custom'
}

/**
 * 地点文本检索：输入景区 / 酒店 / 地标 / 美食 / 车站等关键词，
 * 返回候选地点列表（名称、地址、区域、坐标、推断类型）。
 * 高德返回 GCJ-02 坐标，与高德瓦片坐标系一致，标注无偏移。
 */
export async function searchPlaces(keyword: string): Promise<PlaceResult[]> {
  const kw = keyword.trim()
  if (!kw) return []

  const params = new URLSearchParams({
    keywords: kw,
    key: decodeAmapKey(),
    offset: '10',
    page: '1',
    extensions: 'base',
  })

  const res = await fetch(
    `https://restapi.amap.com/v3/place/text?${params.toString()}`,
  )
  if (!res.ok) return []
  const data = (await res.json()) as AmapPlaceResponse
  if (data.status !== '1' || !Array.isArray(data.pois)) return []

  const results: PlaceResult[] = []
  for (const poi of data.pois) {
    if (!poi.name || !poi.location) continue
    const [lngStr, latStr] = poi.location.split(',')
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const region = [poi.cityname, poi.adname]
      .filter((x) => !!x && x !== '[]')
      .join(' · ')
    results.push({
      name: poi.name,
      address: poi.address && poi.address !== '[]' ? poi.address : '',
      region,
      lat,
      lng,
      markType: inferMarkType(poi.typecode),
    })
  }
  return results
}

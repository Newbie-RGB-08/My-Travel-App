import {
  BedDouble,
  Landmark,
  MapPin,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { MapMarkType } from '@/types'

export const MARK_META: Record<
  MapMarkType,
  { label: string; icon: LucideIcon; hex: string }
> = {
  sight: { label: '景点', icon: Landmark, hex: '#0A84FF' },
  hotel: { label: '酒店', icon: BedDouble, hex: '#BF5AF2' },
  food: { label: '美食', icon: UtensilsCrossed, hex: '#FF9F0A' },
  station: { label: '车站', icon: TrainFront, hex: '#64D2FF' },
  custom: { label: '自定义', icon: MapPin, hex: '#98989F' },
}

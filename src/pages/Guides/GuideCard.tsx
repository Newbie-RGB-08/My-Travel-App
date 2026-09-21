import {
  Pencil,
  Trash2,
  Star,
  ImageIcon,
  Landmark,
  UtensilsCrossed,
  ShoppingBag,
  Drama,
  AlertTriangle,
  Backpack,
  type LucideIcon,
} from 'lucide-react'
import type { Guide, GuideCategory } from '@/types'

export const CATEGORY_META: Record<
  GuideCategory,
  { label: string; icon: LucideIcon; hex: string }
> = {
  sight: { label: '景点', icon: Landmark, hex: '#0A84FF' },
  food: { label: '美食', icon: UtensilsCrossed, hex: '#FF9F0A' },
  shop: { label: '购物', icon: ShoppingBag, hex: '#FF375F' },
  culture: { label: '文化', icon: Drama, hex: '#BF5AF2' },
  pitfall: { label: '避坑', icon: AlertTriangle, hex: '#FF453A' },
  gear: { label: '装备', icon: Backpack, hex: '#30D158' },
}

interface GuideCardProps {
  guide: Guide
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
  highlight?: boolean
}

export function GuideCard({
  guide,
  onEdit,
  onDelete,
  onToggleFavorite,
  highlight,
}: GuideCardProps) {
  const c = CATEGORY_META[guide.category]
  const CIcon = c.icon
  return (
    <div
      className={`card card-hover flex flex-col p-4 ${highlight ? 'ring-2 ring-brand-500' : ''}`}
      data-guide-id={guide.id}
      data-guide-category={guide.category}
      data-guide-favorite={guide.favorite ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CIcon className="h-4 w-4 shrink-0" style={{ color: c.hex }} />
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${c.hex}26`, color: c.hex }}
            >
              {c.label}
            </span>
            {guide.destination && (
              <span className="text-xs text-fg-3">{guide.destination}</span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-fg-1">
            {guide.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onToggleFavorite && (
            <button
              type="button"
              className={`btn-ghost p-1 ${
                guide.favorite ? 'text-warn' : 'text-white/25'
              }`}
              onClick={onToggleFavorite}
              aria-label={guide.favorite ? '取消收藏' : '收藏攻略'}
              aria-pressed={guide.favorite}
            >
              <Star
                className="h-4 w-4"
                fill={guide.favorite ? 'currentColor' : 'none'}
              />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="btn-ghost p-1"
              onClick={onEdit}
              aria-label="编辑攻略"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn-ghost p-1 text-danger hover:bg-danger/10"
              onClick={onDelete}
              aria-label="删除攻略"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {guide.content && (
        <p className="mt-2 flex-1 text-xs text-fg-2 line-clamp-3">
          {guide.content}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-2 text-xs text-fg-3">
        {guide.attachmentIds.length > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <ImageIcon className="h-3 w-3" />
            {guide.attachmentIds.length}
          </span>
        )}
        {guide.tags.map((tag) => (
          <span
            key={tag}
            className="glass-thin rounded px-1.5 py-0.5 text-fg-2"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  )
}

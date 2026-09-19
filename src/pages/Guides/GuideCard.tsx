import { Pencil, Trash2, Star, ImageIcon } from 'lucide-react'
import type { Guide, GuideCategory } from '@/types'

export const CATEGORY_META: Record<
  GuideCategory,
  { label: string; icon: string; color: string }
> = {
  sight: { label: '景点', icon: '🏛️', color: 'bg-blue-100 text-blue-700' },
  food: { label: '美食', icon: '🍜', color: 'bg-amber-100 text-amber-700' },
  shop: { label: '购物', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
  culture: { label: '文化', icon: '🎎', color: 'bg-purple-100 text-purple-700' },
  pitfall: { label: '避坑', icon: '⚠️', color: 'bg-red-100 text-red-700' },
  gear: { label: '装备', icon: '🎒', color: 'bg-green-100 text-green-700' },
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
            <span className="text-base" aria-hidden="true">
              {c.icon}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}
            >
              {c.label}
            </span>
            {guide.destination && (
              <span className="text-xs text-gray-400">{guide.destination}</span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-gray-900">
            {guide.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onToggleFavorite && (
            <button
              type="button"
              className={`btn-ghost p-1 ${
                guide.favorite ? 'text-amber-500' : 'text-gray-300'
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
              className="btn-ghost p-1 text-red-500 hover:bg-red-50"
              onClick={onDelete}
              aria-label="删除攻略"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {guide.content && (
        <p className="mt-2 flex-1 text-xs text-gray-600 line-clamp-3">
          {guide.content}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 text-xs text-gray-400">
        {guide.attachmentIds.length > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <ImageIcon className="h-3 w-3" />
            {guide.attachmentIds.length}
          </span>
        )}
        {guide.tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  )
}

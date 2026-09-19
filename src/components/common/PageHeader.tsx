import type { ReactNode } from 'react'

interface PagePlaceholderProps {
  title: string
  note?: string
}

export function PagePlaceholder({ title, note }: PagePlaceholderProps) {
  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {note && <p className="mt-2 text-sm text-gray-500">{note}</p>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

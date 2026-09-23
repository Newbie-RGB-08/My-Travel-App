import type { ReactNode } from 'react'

interface PagePlaceholderProps {
  title: string
  note?: string
}

export function PagePlaceholder({ title, note }: PagePlaceholderProps) {
  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-semibold text-fg-1">{title}</h1>
      {note && <p className="mt-2 text-sm text-fg-2">{note}</p>}
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-fg-1">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-fg-2">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

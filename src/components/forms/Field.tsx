import { forwardRef, type ReactNode } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  hint?: string
}

export function Field({ label, required, error, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-gray-400">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  )
}

// forwardRef 让 react-hook-form 的 register 能拿到 ref
export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput(props, ref) {
  return <input ref={ref} {...props} className={`input ${props.className ?? ''}`} />
})

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`input min-h-[80px] ${props.className ?? ''}`}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select(props, ref) {
  return (
    <select ref={ref} {...props} className={`input ${props.className ?? ''}`} />
  )
})

// Checkbox：用 span 包裹避免与 Field 的 label 嵌套
export const Checkbox = forwardRef<
  HTMLInputElement,
  { label?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Checkbox({ label, className, ...props }, ref) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={ref}
        type="checkbox"
        {...props}
        className={className ?? 'h-4 w-4 rounded border-gray-300 text-brand-600'}
      />
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </span>
  )
})

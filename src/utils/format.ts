export function formatDateRange(start: string, end: string): string {
  if (!start && !end) return ''
  if (start && !end) return start
  if (!start && end) return end
  return `${start} ~ ${end}`
}

// 格式化 ISO 日期时间字符串为 "YYYY-MM-DD HH:mm"
// 输入形如 "2026-10-01T08:00"（datetime-local）或带秒/Z 的 ISO，统一取本地部分。
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  // 截取到分钟部分：YYYY-MM-DDTHH:mm → 替换 T 为空格
  const head = iso.slice(0, 16)
  if (!head) return iso
  return head.replace('T', ' ')
}

export function formatMoney(amount: number, currency = 'CNY'): string {
  const symbol = currency === 'CNY' ? '¥' : currency + ' '
  return `${symbol}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

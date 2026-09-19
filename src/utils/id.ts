// crypto.randomUUID 浏览器原生，但为兼容测试环境兜底
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // 兜底：基于时间戳 + 随机
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// 抽象环境光晕背景（靛蓝 / 青 / 微量暖橘），纯装饰，不含任何气象意象。
// 3 层固定模糊光斑，仅 transform/opacity 动画；prefers-reduced-motion 下由 CSS 静止。
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="glass-ambient">
      <span className="ambient-blob ambient-blob-1 animate-drift-a" />
      <span className="ambient-blob ambient-blob-2 animate-drift-b" />
      <span className="ambient-blob ambient-blob-3 animate-drift-c" />
    </div>
  )
}

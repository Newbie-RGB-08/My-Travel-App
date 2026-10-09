// 当前账号上下文（模块级，避免 db 层反向依赖 store）。
// 写入钩子据此为新增数据自动注入 ownerId；读取收口据此过滤。
let currentOwnerId: string | null = null

export function setOwnerId(id: string | null): void {
  currentOwnerId = id
}

export function getOwnerId(): string | null {
  return currentOwnerId
}

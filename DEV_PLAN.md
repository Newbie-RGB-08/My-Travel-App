# 旅游生活 App 开发计划（DEV_PLAN）

> 版本：v1.0
> 最后更新：2026-09-19
> 依据：[PRD.md](./PRD.md)
> 状态：待确认后进入执行

本计划把 PRD 拆成**可直接照着做**的任务序列。每个阶段都有：任务清单 → 产出物 → 验收点。任务之间有明确依赖，按顺序执行。

---

## 一、总体策略

- **数据先行**：先把 IndexedDB schema 和 CRUD 层打牢，再写 UI，避免返工。
- **骨架先行**：先做路由 + 布局 + 行程切换器全局状态，让 6 个模块有地方挂。
- **模块独立推进**：每个模块按"列表页 + 弹窗表单 + 空状态"三件套自洽完成，最后再打通跨模块关联。
- **首页最后做**：首页是聚合页，依赖其他模块的数据，放最后。
- **每阶段都对照 PRD 第十节验收标准**，确保不偏离。

---

## 二、技术选型补充（在 PRD 基础上细化）

| 项 | 选择 | 理由 |
|---|---|---|
| 路由 | react-router-dom v6 | React 生态标准，支持嵌套路由 |
| 状态管理 | Zustand | 轻量，适合全局行程切换器状态；不引入 Redux 复杂度 |
| IndexedDB 封装 | Dexie.js | 最成熟的 IndexedDB 封装，支持复杂查询、索引、Blob |
| 地图库 | Leaflet + react-leaflet | 免 key、轻量；瓦片源用高德瓦片 URL（国内细节好）或 OSM 二选一，封装成可切换 |
| 样式方案 | Tailwind CSS | 与"简约清爽、Notion/Linear 风格"匹配，原子类快速搭建 |
| 日期处理 | date-fns | 轻量、tree-shakable，替代 moment |
| 图表（消费汇总） | Recharts | React 原生，饼图/条形图够用 |
| 表单 | react-hook-form | 轻量、性能好，配合 zod 做校验 |
| 图标 | lucide-react | 线性图标，匹配简约风格 |
| 模态/确认框 | 自建轻量组件 | 用 Tailwind + Zustand 全局 modal store 实现 |

> 说明：不引入 Ant Design / MUI 等重型组件库，避免风格被绑架，也避免 bundle 体积大。

---

## 三、IndexedDB Schema 设计（Dexie）

### 3.1 对象仓库（stores）

```
trips          行程
activities     活动
transports     交通安排
expenses       消费记录
guides         攻略
mapMarks       地图标注
routes         路线（连接 mapMarks）
attachments    图片附件（Blob）
```

### 3.2 字段与索引

**trips**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string (uuid) | 主键 |
| name | string | |
| destination | string | |
| startDate | string (ISO) | ✅ |
| endDate | string (ISO) | ✅ |
| companions | string[] | |
| budget | number | |
| status | 'planning' \| 'ongoing' \| 'done' | ✅ |
| createdAt | number | |

**activities**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| tripId | string \| null | ✅ |
| date | string (ISO date) | ✅ |
| slot | 'morning' \| 'afternoon' \| 'evening' | ✅ |
| time | string \| null | |
| place | string | |
| type | 'sight' \| 'food' \| 'shop' \| 'rest' | |
| note | string | |
| linkedExpenseIds | string[] | |
| linkedTransportIds | string[] | |
| linkedGuideIds | string[] | |

**transports**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| tripId | string \| null | ✅ |
| type | 'flight' \| 'train' \| 'bus' \| 'metro' \| 'taxi' \| 'self' | ✅ |
| no | string | 班次号 |
| from | string | |
| to | string | |
| departAt | string (ISO) | ✅ |
| arriveAt | string (ISO) | |
| seat | string | |
| terminal | string | 站台/航站楼 |
| checkinInfo | string | |
| note | string | |
| status | 'pending' \| 'done' \| 'cancelled' | ✅ |

**expenses**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| tripId | string \| null | ✅ |
| activityId | string \| null | ✅ |
| amount | number | |
| currency | string | 默认 'CNY' |
| category | 'transport' \| 'stay' \| 'food' \| 'ticket' \| 'shop' \| 'other' | ✅ |
| time | string (ISO) | ✅ |
| place | string | |
| note | string | |

**guides**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| title | string | |
| destination | string | ✅ |
| category | 'sight' \| 'food' \| 'shop' \| 'culture' \| 'pitfall' \| 'gear' | ✅ |
| content | string | 多行 |
| favorite | boolean | ✅ |
| tags | string[] | |
| tripId | string \| null | ✅ |
| attachmentIds | string[] | 指向 attachments |
| createdAt | number | |

**mapMarks**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| tripId | string \| null | ✅ |
| name | string | |
| type | 'sight' \| 'hotel' \| 'food' \| 'station' \| 'custom' | ✅ |
| lat | number | |
| lng | number | |
| note | string | |

**routes**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| tripId | string \| null | ✅ |
| name | string | |
| markIds | string[] | 顺序连接 mapMarks |

**attachments**
| 字段 | 类型 | 索引 |
|---|---|---|
| id | string | 主键 |
| blob | Blob | 图片二进制 |
| mime | string | |
| createdAt | number | |

### 3.3 关联与级联策略

- **软关联**：所有跨表关系用 `xxxId` 字段存引用，不做外键约束。
- **删除策略**（第一版简化，后续可优化）：
  - 删除 trip → 弹确认框，提示"将解除其下所有活动/交通/消费/攻略/标注的关联（置 tripId=null），不删除子数据"。
  - 删除 activity / transport / expense / guide / mapMark → 直接删除本条，其他表的引用 id 留作悬挂（列表渲染时找不到则跳过），不做自动清理。
  - 删除 attachment → 检查 guides.attachmentIds 并移除引用。

---

## 四、目录结构

```
src/
├─ main.tsx                 入口
├─ App.tsx                  路由根
├─ routes/
│  └─ router.tsx            路由配置
├─ layout/
│  ├─ AppLayout.tsx         左导航 + 右内容容器
│  ├─ Sidebar.tsx           左侧导航 + 行程切换器
│  └─ TripSwitcher.tsx      行程切换器
├─ pages/
│  ├─ Home/                 首页总览
│  ├─ Trips/                行程计划
│  ├─ Transports/           交通安排
│  ├─ Map/                  地图详情
│  ├─ Guides/               游玩攻略
│  └─ Expenses/             消费记录
├─ components/
│  ├─ common/               Modal / ConfirmDialog / EmptyState / Tag / Badge
│  └─ forms/                各模块共享的表单片段
├─ db/
│  ├─ schema.ts             Dexie 定义
│  └─ crud/                 每个实体的 CRUD 函数
├─ store/
│  ├─ useTripStore.ts       当前选中行程（全局）
│  └─ useModalStore.ts      全局弹窗
├─ types/
│  └─ index.ts              TypeScript 类型定义
├─ utils/
│  ├─ id.ts                 uuid
│  ├─ date.ts               date-fns 封装
│  └─ currency.ts          人民币格式化
└─ styles/
   └─ index.css             Tailwind 入口 + 主题变量
```

---

## 五、阶段任务分解

### 阶段 0：项目初始化与基础设施

**任务：**
1. `npm create vite@latest . -- --template react-ts` 初始化
2. 安装依赖：`dexie` `react-router-dom` `zustand` `tailwindcss` `date-fns` `recharts` `react-hook-form` `zod` `lucide-react` `leaflet` `react-leaflet`
3. 配置 Tailwind（content 路径、主题色、主色变量）
4. 配置路径别名 `@/` → `src/`
5. 配置 tsconfig 严格模式
6. 确认 `npm run dev` 可启动空白页

**产出物：** 可运行的空项目骨架
**验收点：** 浏览器打开看到默认页，无报错
**对应 PRD 验收：** 10.1-1

---

### 阶段 1：数据层（Dexie Schema + CRUD）

**任务：**
1. `src/db/schema.ts` 定义 Dexie 子类，注册 8 个 store 和索引（见第三章）
2. `src/types/index.ts` 定义所有实体 TypeScript 类型
3. `src/db/crud/` 下每个实体一个文件，实现 `list / listByTrip / get / add / update / remove`
4. 写一个临时调试页验证 CRUD：增删改查一条 trip 和 activity

**产出物：** 可被 UI 调用的数据层 API
**验收点：** 调试页能增删改查，刷新后数据仍在
**对应 PRD 验收：** 10.2-3（部分）

---

### 阶段 2：应用骨架（路由 + 布局 + 行程切换器）

**任务：**
1. `src/routes/router.tsx` 配置 6 个模块路由（首页 `/`、`/trips`、`/transports`、`/map`、`/guides`、`/expenses`），都用空占位组件
2. `src/layout/AppLayout.tsx` 实现"左导航 + 右内容"布局，左侧固定宽度、右侧滚动
3. `src/layout/Sidebar.tsx` 实现 6 个模块入口 + App 标题 + 设置入口
4. `src/store/useTripStore.ts` 实现全局当前行程状态（`currentTripId` + `setCurrentTrip` + 持久化到 localStorage 记忆上次选择）
5. `src/layout/TripSwitcher.tsx` 实现行程下拉切换器，空行程时显示"创建第一个行程"引导
6. `src/components/common/` 实现 Modal / ConfirmDialog / EmptyState 三个基础组件
7. `src/store/useModalStore.ts` 全局弹窗控制

**产出物：** 可在 6 个模块间切换、行程切换器全局生效的骨架
**验收点：**
- 默认停在首页 `/`
- 点左侧导航切换路由
- 行程切换器能切换，切换后全局状态更新
- 无行程时显示引导按钮

**对应 PRD 验收：** 10.1-2、10.3-6（部分）

---

### 阶段 3：行程计划模块

**任务：**
1. `pages/Trips/` 行程列表页：卡片展示所有行程，按起止日期排序，显示状态徽章
2. 行程新增/编辑弹窗表单：名称、目的地、起止日期、同行人、预算、状态
3. 行程详情视图：按天分组展示活动，每天分上午/下午/晚上三段
4. 活动新增/编辑弹窗：日期、时段、时间、地点、类型、备注
5. 活动卡片预留 🚄/💰/📖 三个图标位（本阶段先占位，阶段 9 打通跳转）
6. 空状态引导组件接入
7. 删除二次确认

**产出物：** 可完整管理行程与活动的模块
**验收点：**
- 能新建/编辑/删除行程和活动
- 活动按上午/下午/晚上排列
- 无数据时显示"创建第一条"引导
- 刷新后数据仍在

**对应 PRD 验收：** 10.5-11、10.7-20

---

### 阶段 4：交通安排模块

**任务：**
1. `pages/Transports/` 列表页：受 `useTripStore` 筛选，默认按 `departAt` 升序
2. 新增/编辑弹窗：类型、班次号、出发地/目的地、出发/到达时间、座位、站台、值机信息、备注、状态、关联行程
3. 状态切换按钮（待出行/已完成/已取消）
4. 类型图标区分（航班✈️ / 火车🚄 / 大巴🚌 / 地铁🚇 / 出租🚕 / 自驾🚗）
5. 空状态引导

**产出物：** 可管理交通安排的模块
**验收点：**
- 能新建航班/火车等记录
- 按出发时间排序
- 状态可切换
- 受行程切换器筛选

**对应 PRD 验收：** 10.5-12、10.3-7

---

### 阶段 5：消费记录模块

**任务：**
1. `pages/Expenses/` 列表页：受 `useTripStore` 筛选，按时间倒序
2. 新增/编辑弹窗：金额、分类、时间、地点、备注、关联行程、关联活动
3. 顶部汇总区：总花费 + 分类占比饼图（Recharts）+ 预算 vs 实际条形对比
4. 分类筛选 + 时间排序控件
5. 空状态引导

**产出物：** 可记录消费并汇总的模块
**验收点：**
- 能新建消费
- 按分类汇总
- 看到预算 vs 实际对比
- 受行程切换器筛选

**对应 PRD 验收：** 10.5-15

---

### 阶段 6：游玩攻略模块

**任务：**
1. `pages/Guides/` 列表页：卡片展示，受 `useTripStore` 筛选
2. 新增/编辑弹窗：标题、目的地、分类、正文（多行 textarea）、标签、收藏、关联行程
3. 图片粘贴/上传：监听 paste 事件 + 文件选择，存 Blob 到 attachments，预览
4. 收藏/取消收藏按钮
5. 按分类 / 标签 / 目的地筛选
6. 空状态引导

**产出物：** 可收集攻略、存图片、收藏的模块
**验收点：**
- 能新建条目
- 能粘贴截图且刷新后图片仍在
- 能收藏
- 受行程切换器筛选

**对应 PRD 验收：** 10.5-14

---

### 阶段 7：地图详情模块（唯一联网）

**任务：**
1. 安装 `leaflet` `react-leaflet`
2. `pages/Map/` 左侧标注列表 + 右侧地图布局
3. 初始化地图，瓦片源封装成可切换常量（默认高德瓦片 URL，备选 OSM）
4. 在地图上点击 → 添加标注（弹小表单填名称/类型/备注）
5. 标注按类型显示不同图标
6. 左侧列表点击 → 地图飞到该标注
7. 路线功能：选多个标注 → 连线，存 routes 表
8. 受 `useTripStore` 筛选标注和路线
9. 断网降级：瓦片加载失败时显示"地图需联网"，但左侧列表仍可用
10. 空状态引导

**产出物：** 可在地图上标点、画路线的模块
**验收点：**
- 能点选添加标注
- 左侧列表点击地图跳转定位
- 能画路线
- 受行程切换器筛选
- 断网时本地列表仍可查看

**对应 PRD 验收：** 10.5-13、10.8-22

---

### 阶段 8：首页总览模块

**任务：**
1. `pages/Home/` 四宫格 + 快速跳转
2. 区块1：当前行程概况（名称/目的地/日期/状态/预算 vs 实际）→ "查看全部"跳 `/trips`
3. 区块2：临近交通安排（最近 3~5 条，高亮待出行）→ 跳 `/transports`
4. 区块3：本行程消费汇总（总额 + 分类占比小图）→ 跳 `/expenses`
5. 区块4：收藏攻略（最多 5 条）→ 跳 `/guides`
6. 无行程时显示"先创建一次行程吧"引导
7. 各区块右上角"查看全部"按钮

**产出物：** 信息聚合首页
**验收点：**
- 选中行程后首页显示四个摘要
- 无行程时显示引导
- 各区块跳转正确

**对应 PRD 验收：** 10.4-9、10.4-10

---

### 阶段 9：跨模块关联与跳转打通

**任务：**
1. 活动卡片 🚄/💰/📖 图标实现点击跳转：
   - 🚄 → `/transports` 并定位到对应 transport（query 参数 `?highlight=xxx`）
   - 💰 → `/expenses?highlight=xxx`
   - 📖 → `/guides?highlight=xxx`
2. 各模块支持读取 `highlight` 参数并高亮/滚动到对应条目
3. 在活动编辑表单中增加"关联交通/消费/攻略"的选择器（从对应表拉数据）
4. 消费、交通、攻略编辑表单中增加"关联活动"选择器
5. 首页"查看全部"跳转联动验证

**产出物：** 模块间可双向关联跳转
**验收点：**
- 活动卡片点 🚄 跳交通并高亮
- 点 💰 跳消费并高亮
- 点 📖 跳攻略并高亮

**对应 PRD 验收：** 10.6-16、10.6-17、10.6-18

---

### 阶段 10：视觉打磨与空状态统一

**任务：**
1. 统一配色：白底 `#FFFFFF`、主色变量、文字三档灰、分隔线浅灰
2. 统一间距系统（4/8/12/16/24/32）
3. 统一卡片样式（圆角 8px、轻投影、hover 微抬）
4. 统一按钮层级（主按钮/次按钮/危险按钮/文本按钮）
5. 统一表单控件样式（input/select/textarea/checkbox）
6. 全模块空状态文案与图标统一
7. 全局滚动条、字体、行高微调

**产出物：** 视觉一致的完整应用
**验收点：** 整体白底、留白、Notion/Linear 感

**对应 PRD 验收：** 10.7-19、10.7-20

---

### 阶段 11：验收测试

**任务：** 按 PRD 第十节 22 条逐项验收，重点：
1. 数据持久化三连测：关标签页 → 关浏览器 → 重启电脑
2. 同浏览器多标签页数据一致
3. 断网测试：拔网线后 5 个模块正常，地图模块降级
4. 行程切换器全局联动验证
5. 跨模块跳转验证

**产出物：** 验收清单勾选结果
**验收点：** PRD 10.1~10.8 全部 ✅

---

## 六、关键决策与风险

### 6.1 需要阶段 0 之前敲定的决策
| 决策点 | 推荐方案 | 备选 |
|---|---|---|
| 地图瓦片源 | 高德瓦片 URL（国内细节好，免 key） | OSM（全球，国内细节弱） |
| UUID 生成 | `crypto.randomUUID()`（浏览器原生，无需库） | nanoid |
| 日期存储格式 | ISO 8601 字符串 | 时间戳 number |

### 6.2 风险与对策
| 风险 | 对策 |
|---|---|
| IndexedDB 在 `file://` 协议受限 | 严格用 `npm run dev` 跑本地服务，PRD 已确认 |
| 图片 Blob 预览内存占用 | 预览用 `URL.createObjectURL` + 卸载时 `revokeObjectURL` |
| 删除关联产生悬挂 id | 渲染列表时找不到的引用静默跳过，不报错 |
| react-leaflet 版本与 React 18 兼容 | 锁定 react-leaflet v4（支持 React 18） |
| 高德瓦片 URL 偶尔被限流 | 封装瓦片源常量，可一行切换到 OSM |
| Tailwind 4 vs 3 | 用 Tailwind 3（生态稳，文档全） |

---

## 七、验收节点映射（PRD 第十节 ↔ 阶段）

| PRD 验收项 | 完成阶段 |
|---|---|
| 10.1 启动运行（1~2） | 阶段 0 + 阶段 2 |
| 10.2 数据持久化（3~5） | 阶段 1 + 阶段 11 |
| 10.3 导航联动（6~8） | 阶段 2 + 各模块阶段 |
| 10.4 首页内容（9~10） | 阶段 8 |
| 10.5 各模块功能（11~15） | 阶段 3~7 |
| 10.6 跨模块关联（16~18） | 阶段 9 |
| 10.7 视觉体验（19~20） | 阶段 10 |
| 10.8 联网范围（21~22） | 阶段 7 + 阶段 11 |

---

## 八、执行建议

1. **严格按阶段顺序**：阶段 0/1/2 是地基，跳过会返工。
2. **每阶段完成即对照验收点**：不要积压到最后。
3. **阶段 3~7 顺序可微调**，但建议行程计划（阶段 3）先做，因为它是关联中心，其他模块要挂行程。
4. **阶段 9（跨模块关联）务必在所有模块完成后做**，否则跳转目标不存在。
5. **阶段 11（验收）是硬门槛**，数据持久化三连测不过则不算完成。

---

## 附：与 PRD 的对应关系

- 本计划第三章 Schema 直接对应 PRD 5.1~5.5 各模块字段
- 本计划第五章各阶段任务直接对应 PRD 第八节"必须完成功能"清单
- 本计划第七章验收节点映射直接对照 PRD 第十节 22 条验收标准
- PRD 第九节"暂不做功能"在本计划中无对应任务，确保不超范围

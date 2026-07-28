# 悬赏任务公会 (Quest Guild) - 需求拆解文档

## 产品概述

- **产品类型**: 桌面端网页应用 / 游戏化目标管理工具
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 希望用游戏化方式克服拖延、管理复杂长期目标，同时能处理日常零碎任务的个人用户
- **核心价值**: 把"人生目标"变成"史诗任务"，通过任务拆解引导、专注追踪、技能成长和可视化奖励，提升规划力与执行力
- **界面语言**: 中文
- **主题偏好**: 深色（深色魔幻RPG游戏UI风格，深灰/黑色背景，金色边框和文字，紫色/蓝色作为强调色）
- **导航模式**: 路径导航
- **导航布局**: Sidebar（左侧导航栏 + 顶部状态栏，桌面应用风格）

---

## 页面结构总览

> **说明**：此表为页面生成的唯一数据源，包含所有页面（一级+二级）

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 今日任务 | `TodayPage.tsx` | `/` | 一级 | 导航（首页默认） |
| 悬赏池 | `QuestPoolPage.tsx` | `/quest-pool` | 一级 | 导航 |
| 技能树 | `SkillTreePage.tsx` | `/skill-tree` | 一级 | 导航 |
| 公会商店 | `ShopPage.tsx` | `/shop` | 一级 | 导航 |
| 统计面板 | `StatsPage.tsx` | `/stats` | 一级 | 导航 |
| 设置 | `SettingsPage.tsx` | `/settings` | 一级 | 导航 |

> **页面类型说明**：
> - **一级页面**：出现在导航中，用户可直接访问
> - **二级页面**：不在导航中，从一级页面跳转进入

---

## 页面布局建议

### 全局布局（所有页面共享）

- **布局模式**: 左侧 Sidebar 导航 + 顶部状态栏 + 主内容区
- **视觉重心**: 主内容区（各功能模块）
- **顶部状态栏**: 法力水晶数量、公会声望积分、今日专注时长（全局常驻）
- **左侧导航栏**: 悬赏池、今日任务、技能树、公会商店、统计、设置（RPG 游戏面板风格，金色/紫色装饰）

### 今日任务页 (`/`)

- **布局模式**: 上下分区（追踪任务区在上，注意力任务区在下）
- **视觉重心**: 追踪任务区（主线专注任务，大号计时器 + Boss 进度条）
- **结果承载区**: 注意力任务卡片流（今日激活的次级任务）；初始态显示示例任务 + "快速悬赏"按钮

### 悬赏池页 (`/quest-pool`)

- **布局模式**: 左右分栏（左侧分类筛选 + 右侧任务列表/树形结构）
- **视觉重心**: 任务列表区（史诗任务树形 + 每日悬赏列表）
- **结果承载区**: 任务详情/创建弹窗；初始态显示预设示例任务

### 技能树页 (`/skill-tree`)

- **布局模式**: 单页全屏画布（可拖拽、缩放、平移）
- **视觉重心**: 技能树可视化画布
- **结果承载区**: 节点详情侧栏（点击节点弹出）；初始态显示预设技能树框架

### 公会商店页 (`/shop`)

- **布局模式**: 商品网格 + 已兑换清单（上下或左右）
- **视觉重心**: 可兑换商品列表
- **结果承载区**: 兑换成功提示 + 已兑换清单；初始态显示预设商品

### 统计面板页 (`/stats`)

- **布局模式**: 卡片网格 + 图表区
- **视觉重心**: 数据统计卡片 + 图表
- **结果承载区**: 统计数据实时计算展示；初始态基于示例数据渲染

### 设置页 (`/settings`)

- **布局模式**: 单栏表单分组
- **视觉重心**: 设置项表单
- **结果承载区**: 保存成功提示；初始态显示默认配置

---

## 导航配置

> **说明**：此表为导航生成的数据源，路由需与页面结构总览一致

- **导航布局**: Sidebar（左侧固定，深色RPG面板风格）
- **顶部状态栏**: 法力水晶💎、公会声望⭐、今日专注时长⏱️
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标(可选) |
|---------|------|-----------|
| 今日任务 | `/` | Scroll |
| 悬赏池 | `/quest-pool` | Swords |
| 技能树 | `/skill-tree` | TreePine |
| 公会商店 | `/shop` | Store |
| 统计面板 | `/stats` | BarChart3 |
| 设置 | `/settings` | Settings |

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 任务数据（史诗任务/每日悬赏） | local-persist | localStorage key=`__quest_guild_tasks`，JSON 序列化存储，含预设示例数据 | 首次加载注入 3-5 条 source='mock' 示例任务 |
| 技能树数据 | local-persist | localStorage key=`__quest_guild_skills`，含预设技能树框架 | 首次加载注入完整预设技能树结构 |
| 商店商品数据 | local-persist | localStorage key=`__quest_guild_shop_items`，含预设商品 | 首次加载注入 5-8 条 source='mock' 示例商品 |
| 公会声望积分 | local-persist | localStorage key=`__quest_guild_reputation`，数值类型 | 初始值 0（或示例值 150） |
| 法力水晶数量 | local-persist | localStorage key=`__quest_guild_mana_crystals`，含上限配置 | 默认上限 5 |
| 今日专注时长 | local-persist | localStorage key=`__quest_guild_focus_time`，按日期存储 | 初始值 0 |
| 已兑换记录 | local-persist | localStorage key=`__quest_guild_redemptions` | 初始空数组 |
| 统计数据 | local-persist | 基于任务/专注记录动态计算，不单独存储 | 基于示例数据计算 |
| 用户设置 | local-persist | localStorage key=`__quest_guild_settings` | 默认配置（法力上限、主题等） |
| 追踪任务计时状态 | local-persist | localStorage key=`__quest_guild_active_track`，含当前追踪任务ID、累计时长、开始时间戳 | 初始 null |

> 类型选择说明：用户明确要求"使用浏览器本地存储（localStorage）保存所有数据"，因此所有核心数据均为 `local-persist` 类型。预设示例数据作为首次加载的初始值注入，每条标记 `source: 'mock'`。

---

## 功能列表

> **说明**：每个页面的功能点，供页面生成使用

### 今日任务页 (`/`)

- **页面目标**: 展示当前追踪任务与注意力任务，支持专注计时与快捷任务录入
- **功能点**:
  - **追踪任务展示与计时**: 显示当前唯一追踪任务，含任务名称、Boss 进度条、专注计时器（时:分:秒）、开始/暂停按钮；计时状态持久化到 localStorage
  - **注意力任务卡片流**: 以卡片形式展示今日激活的注意力任务，显示任务名、预估用时、标签；卡片点击标记完成，带粒子特效动画
  - **快速悬赏录入**: 底部快捷录入按钮，弹出简易表单（任务名 + 预估用时 + 类型），快速创建每日悬赏任务
  - **任务激活/切换**: 支持从悬赏池选择任务设为追踪任务或添加到注意力任务区，强制校验"1个追踪 + N个注意力"规则
  - **完成奖励结算**: 任务完成后自动计算并增加公会声望积分，toast 提示获得积分

### 悬赏池页 (`/quest-pool`)

- **页面目标**: 管理所有任务，支持创建、查看、层级展示
- **功能点**:
  - **任务分类展示**: 按史诗任务/每日悬赏分类切换，史诗任务以树形结构展示父子层级
  - **创建新任务**: 弹出创建表单，包含任务名称、描述、类型（史诗/每日）、预估用时、难度等级（简单/普通/困难/史诗）、关联技能、Boss名称（史诗特有）
  - **任务详情查看**: 点击任务卡片展开/跳转查看完整详情、子任务列表、完成状态
  - **激活到今日**: 将悬赏池中的任务添加到今日任务面板（设为追踪或注意力任务），受法力水晶上限限制
  - **任务编辑与删除**: 支持修改任务信息、删除任务（带确认弹窗）

### 技能树页 (`/skill-tree`)

- **页面目标**: 可视化展示全局技能树，支持交互查看与技能点亮
- **功能点**:
  - **技能树可视化**: 放射状/树状布局，支持拖拽平移、滚轮缩放；预设编程、设计、语言、商业、生活技能等大类及子节点
  - **节点状态展示**: 节点显示三种状态（未解锁/已点亮/已强化），不同颜色与光效区分
  - **节点详情面板**: 点击节点弹出侧栏，显示技能名称、描述、解锁条件、关联任务
  - **技能点亮**: 完成史诗任务后可点亮对应技能节点，带光芒动画效果；消耗技能点解锁新方向
  - **技能点管理**: 显示当前可用技能点，解锁节点时扣除，完成史诗任务获得技能点

### 公会商店页 (`/shop`)

- **页面目标**: 展示可兑换奖励，支持自定义商品与兑换操作
- **功能点**:
  - **商品列表展示**: 网格布局展示可兑换商品，含名称、所需积分、图标；按积分排序或分类筛选
  - **兑换操作**: 点击兑换按钮，扣除对应公会声望积分，商品进入"已兑换"清单；积分不足时禁用并提示
  - **添加自定义商品**: 弹出表单，用户可添加自定义奖励（名称、积分、图标/颜色）
  - **已兑换清单**: 展示历史兑换记录，含兑换时间、商品名称、消耗积分
  - **商品管理**: 支持编辑/删除自定义商品（预设商品不可删除）

### 统计面板页 (`/stats`)

- **页面目标**: 展示任务完成与专注数据统计
- **功能点**:
  - **核心指标卡片**: 本周专注总时长、完成任务数量、连续完成天数、总声望获得，以 KPI 卡片形式展示
  - **任务完成统计**: 柱状图展示近 7 天每日完成任务数
  - **专注时长趋势**: 折线图展示近 7 天/30 天专注时长变化
  - **技能成长轨迹**: 时间线展示已点亮技能节点的解锁顺序与时间
  - **难度分布统计**: 环形图展示不同难度任务的完成占比

### 设置页 (`/settings`)

- **页面目标**: 配置应用参数与偏好
- **功能点**:
  - **法力水晶设置**: 设置注意力任务上限（默认 3-5 个）
  - **每日重置时间**: 设置每日任务重置的时间点
  - **数据管理**: 导出数据（JSON 文件下载）、导入数据、重置所有数据（带二次确认）
  - **关于信息**: 应用版本、说明文字

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__quest_guild_tasks` | 所有任务列表，类型为 `IQuestTask[]` | 今日任务、悬赏池、统计面板 |
| `__quest_guild_skills` | 技能树节点数据，类型为 `ISkillNode[]` | 技能树、悬赏池、统计面板 |
| `__quest_guild_shop_items` | 商店商品列表，类型为 `IShopItem[]` | 公会商店 |
| `__quest_guild_reputation` | 公会声望积分，类型为 `number` | 全局状态栏、今日任务、公会商店 |
| `__quest_guild_mana_crystals` | 法力水晶配置，类型为 `IManaConfig` | 全局状态栏、今日任务、设置 |
| `__quest_guild_active_track` | 当前追踪任务状态，类型为 `IActiveTrack \| null` | 今日任务、全局状态栏 |
| `__quest_guild_focus_log` | 专注记录日志，类型为 `IFocusLog[]` | 统计面板、今日任务 |
| `__quest_guild_redemptions` | 兑换记录，类型为 `IRedemption[]` | 公会商店 |
| `__quest_guild_settings` | 用户设置，类型为 `IAppSettings` | 设置页、全局 |
| `__quest_guild_skill_points` | 可用技能点，类型为 `number` | 技能树 |

```ts
// 任务接口
interface IQuestTask {
  id: string;
  name: string;
  description: string;
  type: 'epic' | 'daily'; // 史诗任务 / 每日悬赏
  difficulty: 'easy' | 'normal' | 'hard' | 'epic'; // 难度等级
  estimatedMinutes: number; // 预估用时（分钟）
  actualMinutes: number; // 实际用时（分钟）
  relatedSkillId?: string; // 关联技能ID
  bossName?: string; // Boss名称（史诗任务特有）
  bossProgress: number; // Boss进度 0-100
  parentId?: string; // 父任务ID（史诗子任务用）
  status: 'pending' | 'active' | 'completed';
  isTracking: boolean; // 是否为追踪任务
  isAttention: boolean; // 是否为注意力任务
  rewardReputation: number; // 奖励声望
  rewardSkillPoints: number; // 奖励技能点
  createdAt: number;
  completedAt?: number;
  source?: 'mock' | 'user'; // 数据来源
  tags?: string[]; // 标签
}

// 技能节点接口
interface ISkillNode {
  id: string;
  name: string;
  description: string;
  category: string; // 大类：编程/设计/语言/商业/生活技能
  parentId?: string; // 父节点ID
  level: number; // 层级 0=根节点
  status: 'locked' | 'unlocked' | 'enhanced'; // 未解锁/已点亮/已强化
  x: number; // 画布X坐标（预计算）
  y: number; // 画布Y坐标（预计算）
  icon?: string; // 图标标识
  requiredSkillPoints: number; // 解锁所需技能点
  unlockedAt?: number; // 解锁时间戳
}

// 商店商品接口
interface IShopItem {
  id: string;
  name: string;
  cost: number; // 所需积分
  icon: string; // 图标/emoji
  color?: string; // 卡片颜色
  description?: string;
  source: 'mock' | 'user';
  createdAt: number;
}

// 法力水晶配置
interface IManaConfig {
  maxAttentionTasks: number; // 注意力任务上限，默认 3-5
  current: number; // 当前已用
}

// 当前追踪任务状态
interface IActiveTrack {
  taskId: string;
  accumulatedSeconds: number; // 累计秒数
  lastStartTime?: number; // 最近一次开始时间戳
  isRunning: boolean; // 是否正在计时
}

// 专注记录
interface IFocusLog {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  completedAt: number;
}

// 兑换记录
interface IRedemption {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  redeemedAt: number;
}

// 应用设置
interface IAppSettings {
  manaMax: number; // 法力水晶上限
  resetTime: string; // 每日重置时间 HH:mm
  soundEnabled: boolean; // 音效开关
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 无参考图，按产品语义与RPG游戏化定位自主建立视觉系统
- **核心情绪 / 应用类型**: 深色魔幻RPG面板风格的个人目标管理工具，让任务执行带有冒险仪式感与成长反馈
- **独特记忆点**: 法力水晶状态栏 + Boss进度条 + 技能树光效点亮，把每一次任务完成变成"击败Boss、获得声望、点亮天赋"的RPG成长闭环

## 2. Art Direction

- **方向名**: Dark Fantasy RPG Panel
- **Design Style**: Dark Fantasy UI + Gothic Ornament —— 以魔兽/暗黑式面板为骨架，金色符文边框与紫色魔法辉光为识别点，适合游戏化目标管理的沉浸感
- **DNA 参数**: 圆角 subtle（`rounded-md`，面板直角微圆）/ 阴影 layered（外发光 + 内阴影双层）/ 间距 standard（`gap-4` / `p-6`）/ 字体方向（display 衬线游戏风 + body 清晰无衬线）/ 装饰手法（符文角饰、发光边框、进度条光效、粒子完成动效）
- **应用类型**: Tool / Dashboard 混合 —— 左侧导航 + 顶部状态栏 + 主内容区多模块切换

## 3. Color System

**色彩关系**: 深石墨底 + 暗紫面板层 + 金色主识别 + 紫蓝魔法强调 + 翠绿成功态，整体低明度高对比，辉光只出现在交互与关键状态
**配色设计理由**: 金色承担品牌与主行动（声望、CTA、标题），紫色/蓝紫承担魔法氛围与次级强调（法力水晶、技能树、hover辉光），翠绿承担完成/成功（任务完成、Boss击败），深灰黑基底保证长时间使用不刺眼
**主色推导**: 从"公会声望"与"史诗任务"语义提取金色作为 primary，象征成就与奖励；紫色 accent 对应"法力水晶 / 魔法符文"的魔幻设定；二者在深色底上形成金紫对比，符合RPG面板经典配色
**使用比例**: 65% 深中性（bg/card/border）/ 25% 紫蓝辅助（accent/法力/技能树）/ 10% 金色 primary（CTA、标题、声望、关键状态）；主按钮与激活态用金，hover与氛围用紫，完成用绿

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(220 15% 7%) | 页面最深底，接近夜幕石墨 |
| card | `--card` | `bg-card` | hsl(225 18% 12%) | 面板与卡片底色，比背景略亮带紫调 |
| text | `--foreground` | `text-foreground` | hsl(42 60% 82%) | 金米色正文，高对比可读 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(220 10% 55%) | 灰紫次级文字，说明与占位 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(42 85% 58%) | 金色主色，声望/CTA/标题装饰 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(220 20% 8%) | 深石墨色，金色按钮上的文字 |
| accent | `--accent` | `bg-accent` | hsl(265 65% 45%) | 魔法紫，法力水晶/技能树/hover辉光 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(260 30% 95%) | 淡紫白，紫色底上的文字 |
| border | `--border` | `border-border` | hsl(225 15% 22%) | 面板边界，暗紫灰，低于文字权重 |

**语义色提示**: 成功（翠绿）`hsl(145 55% 48%)`，三态：bg `hsl(145 50% 18%)` / border `hsl(145 55% 40%)` / text `hsl(145 60% 72%)`，用于任务完成、Boss击败、技能点亮；警告（琥珀橙）`hsl(30 80% 55%)`，三态：bg `hsl(30 60% 18%)` / border `hsl(30 70% 45%)` / text `hsl(30 70% 75%)`，用于法力不足、难度史诗提示；错误（暗红）`hsl(0 55% 50%)`，三态：bg `hsl(0 40% 15%)` / border `hsl(0 50% 40%)` / text `hsl(0 60% 75%)`，用于兑换积分不足、表单错误。所有语义色饱和度与 primary 金色对齐 ±15%，避免状态色刺眼盖过主风格。

## 4. 字体与节奏

- **font-display**: Cinzel + Noto Serif SC —— 衬线石刻感，适合RPG标题、声望数值、Boss名称，营造史诗与公会仪式感
- **font-body**: Noto Sans SC + Inter —— 清晰无衬线，保证任务描述、列表、设置页长时间阅读舒适
- **字号**: H1 text-4xl ~ text-5xl（金色带微光）；H2 text-xl ~ text-2xl；body text-sm ~ text-base；muted text-xs ~ text-sm。
- **圆角**: 小（`rounded-md`）—— 面板接近直角微圆，符合古典RPG硬质边框感；按钮同圆角体系。

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导，顶部状态栏 + 左侧导航 + 主内容区三栏式桌面应用骨架
- **Page / Section Order**: 今日任务（默认）→ 悬赏池 → 技能树 → 公会商店 → 统计 → 设置，共 6 个主模块，与需求 1:1 对齐
- **Standard Content Zone**: 后台级 `max-w-[1400px]` + `mx-auto`，适配桌面宽屏（最小 1280px）
- **Shell / Frame Alignment**: 同宽 —— 顶部状态栏全宽，左侧导航固定 240px，主内容区随标准内容区居中，内边距与导航保持 8px 倍数节奏
- **Padding & Rhythm**: 主内容区 `px-6 lg:px-8 py-6`，卡片内 `p-5`，模块间距 `gap-6`，保持 8px 倍数
- **Full-bleed Zones**: 技能树画布可全宽铺满主内容区（`w-full h-[calc(100vh-180px)]`），不受 max-w 约束；其余模块卡片受标准内容区约束
- **Local Narrowing**: 设置页、任务创建表单可局部收窄至 `max-w-2xl` 居中，提升表单填写专注度
- **Overflow Strategy**: 悬赏池树形列表、商店商品网格使用垂直滚动；技能树使用画布级拖拽平移缩放；宽表格用 `overflow-x-auto`
- **Flexibility Boundary**: 允许卡片内边距与列表密度按模块微调；不允许切换主色、圆角体系、阴影语言或导航形态

## 6. 视觉与动效

- **装饰**: 符文角饰（四角金色细线装饰）、发光边框（primary/accent 的 box-shadow 外发光）、进度条光效（末端渐隐辉光）
- **阴影/边界**: 重 —— 面板双层阴影（内阴影凹陷 + 外发光轮廓），卡片 border 1px + 外发光 8~16px，按钮 hover 金色辉光
- **动效**: 精致偏丰富 —— 任务完成粒子爆裂 + 声望数字跳动；技能点亮径向光芒扩散；页面切换淡入 + 轻微上移；按钮 hover 辉光渐强；所有动效 200~400ms，ease-out

## 7. 组件原则

- 按钮、输入、菜单、卡片必须具备 Default / Hover / Active / Focus-visible / Disabled 五态，focus 用金色外发光环
- Primary 金色按钮用于主行动（开始追踪、确认击败Boss、兑换）；Secondary 用暗紫描边按钮；Ghost 菜单项用紫色 accent 底承接 hover/selected
- 卡片统一使用 `bg-card` + `border-border` + 四角符文装饰 + 轻微外发光；任务卡片完成态叠加翠绿内发光
- 加载与空状态延续RPG面板语言，使用符文占位 + 金色提示文字，不回退到默认 shadcn 样式

## 8. Image Direction

- **Image Role**: 背景氛围图 + 技能树节点图标 + 商店商品图标；无 Hero 大图
- **Image Art Direction**: 背景为极低明度的暗紫魔法纹理（类似旧羊皮纸 + 微光符文），居中暗四周更暗，保证前景文字可读；技能图标为圆形徽章式，金色描边 + 紫色/绿色内发光，风格统一为手绘奇幻风；商店图标为等距小物件插画，暖色调，与金色边框协调。整体光线为侧上方弱光源，材质为金属 + 晶石 + 旧皮革，情绪是神秘而有成就感的冒险氛围
- **Image Prompt Keywords**: dark fantasy UI, golden ornate borders, purple magical glow, rune engravings, leather and parchment texture, low key lighting, isometric item icons, circular skill badges, RPG inventory style, subtle particle dust, deep shadow, cinematic atmosphere
- **Image Avoidance**: 避免卡通Q版风格、高饱和霓虹赛博风、现代扁平矢量图标、商务人物素材、无意义抽象渐变、亮白色背景、廉价游戏礼包弹窗感

## 9. Anti-patterns

- **Split personality**: 不同模块用不同配色语言（如商店变亮色、技能树变赛博）；全站统一深底金紫体系
- **Glow overdose**: 每个元素都加外发光导致画面油腻；辉光只用于 primary CTA、accent 激活态、成功完成态和法力水晶
- **Default SaaS drift**: 回到默认蓝按钮 + 白卡片 + 通用图标；所有组件必须经过RPG面板语言重铸
- **Invisible interaction**: 只做 hover 不做 focus-visible；键盘导航必须有金色发光环可见状态
- **Mono-hue tyranny**: 金色铺满按钮、tab、icon、边框、链接、标题；按 65-25-10 分配，金色只给 CTA 与品牌锚点，其余用紫蓝 accent 与中性色
- **Status color drift**: 成功绿/警告橙饱和度过高，盖过主风格；语义色饱和度与 primary 金色对齐 ±15%
- **Readability sacrifice**: 为了游戏感用花哨字体排正文；正文坚持 Noto Sans SC，display 字体只用于标题和关键数值

---

# Electron 桌面版

## 概述

- **交付物**：完全离线可用的桌面端应用（.exe / 便携版 / 安装版）
- **技术栈**：Electron 28 + 同代码库 Vite React 前端
- **特性**：保留全部网页版功能，新增悬浮窗、系统托盘、全屏主窗口能力，零外部 CDN 依赖，所有数据存储加密。

---

## Electron 特有功能

### 系统托盘
- 常驻托盘图标显示/隐藏主窗口/悬浮窗
- 右键菜单：打开主窗口 / 显示悬浮窗 / 今日任务概览（占位） / 退出
- 单击托盘快速切换主窗口可见性
- 主窗口关闭按钮默认最小化到悬浮窗而非直接退出

### 悬浮窗

- 收起态：迷你悬浮条（宽 360px / 高 72px），展示当前追踪任务名称、专注计时器、法力水晶占位；-webkit-app-region:drag 区域可直接拖拽移动，-webkit-app-region:no-drag 给按钮和任务卡片点击
- 展开态：鼠标悬停 180ms 延迟展开，宽 360px / 高 500px 完整面板，包含追踪任务、快捷操作、注意力任务、底部快捷栏；展开后面板移出鼠标 260ms 延迟收起；收起条淡出、展开面板淡入/位移，搭配平滑高度变化（200ms ~ 260ms）
- 完全脱网可用：本地渲染的纯静态 HTML/CSS/JS，无外部资源请求
- 位置记忆：自动保存最后拖拽位置到 electron-store
- 收起态只保留顶部条可点击区域，其余透明穿透
- 窗口缩放锚点为底边，窗口高度增大时保持底边不动向下移动

### 离线改造
- 完全去除所有外部 CDN 资源引用、监控 SDK（Slardar、Performance SDK）、模板占位串（{{appName}}/{{appAvatar}} 等）
- Vite 前端统一打包，在 quest-guild-electron/renderer/app/ 下生成干净无依赖的生产构建产物
- 打包产物内所有资源路径为 ./ 开头的相对路径，配合 HashRouter（file:/// 协议下可用）
- electron-builder 打包产物目录从 dist 切换到 release 目录下，避免老目录占用冲突
- electron-builder 配置 setAsDefaultProtocolClient 以及 nsis 设置为可选（可选启动菜单、快捷方式）
- electron-builder 配置关闭代码签名，解决在网络受限环境下下载签名相关依赖失败
- electron-builder 配置 electron 本地缓存配置指向项目 .electron-cache

---

## 构建与打包流程

### 项目布局

```
quest-guide/
├── src/                 # 原版前端源文件
├── index.html          # 原版前端入口
├── vite.config.ts      # 原版 Vite 配置
├── quest-guild-electron/ # Electron 桌面版包
│   ├── main.js       # 主进程（窗口管理 / ipc 事件）
│   ├── preload.js    # 预加载脚本（contextBridge 暴露 electronAPI）
│   ├── package.json  # Electron 包配置
│   ├── package-lock.json
│   ├── renderer/      # 渲染进程页面
│   │   ├── float.html  # 独立悬浮窗页面
│   │   └── app/      # 主窗口渲染页面（Vite 构建产物，build:renderer 命令生成）
│   ├── assets/      # 本地资源目录（icon.ico/icon.png 待用户自行添加）
│   ├── .electron-cache/  # Electron 本地缓存目录
│   └── .gitignore
├── AGENTS.md          # 本文档
├── package.json        # 根包配置
└── vite.config.ts
```

### 使用命令

- 安装依赖：根目录 + Electron 目录各自 npm install

```bash
# 根目录（前端依赖）
cd quest-guide && npm install

# Electron 目录（Electron 依赖）
cd quest-guild-electron && npm install
```

- 构建渲染端并启动开发模式：

```bash
cd quest-guild-electron && npm start
```

- 打包构建命令：

```bash
cd quest-guild-electron && npm run build:win64
```

输出产物：

- release/win-unpacked/：未打包可执行文件目录
- release/悬赏任务公会 Setup 1.0.0.exe：64 位安装包（一键安装/卸载）
- release/悬赏任务公会-Portable.exe：64 位便携版（绿色免安装）

---

## 打包配置说明

（主要配置在 `quest-guild-electron/package.json`）

- `directories.output`: 输出目录设为 `release`
- `win.target`: nsis + portable，arch x64
- `files` 包含 main.js, preload.js, renderer/**, assets/**
- `nsis`: `oneClick: false`，支持自定义安装位置；`createDesktopShortcut: true`，创建桌面快捷方式；`createStartMenuShortcut: true`，创建开始菜单项
- `productName`: `悬赏任务公会`
- `build.productName`: `悬赏任务公会`
- `build.directories.output`: `release`

---

## 数据存储与迁移

Electron 桌面版使用 `electron-store` 加密 JSON 文件本地存储，默认存储在 Windows %APPDATA%/quest-guild/ 下的 `quest-guild-data.json`。

Electron 主进程通过 preload 脚本暴露 `window.electronAPI` 下的 store 操作，在渲染进程里调用；悬浮窗 float.html 也用同样的 store。

---

## 后续可做优化

- 完善悬浮窗主窗口数据双向同步
- 完善主窗口前端状态保存
- 完善主窗口前端对接 electron-store
- 完善悬浮窗展开态快捷栏功能（快速悬赏/技能树/公会商店）
- 完善图标替换（现在只有占位）
- 完善开机自启（可选）
- 完善更新逻辑（可选）

---

# 当前实现进展（2026-07-28 更新）

## 当前工程现状

- 前端已从飞书容器 / `@lark-apaas/*` preset 迁移到标准 Web 工程：
  - `vite@8` + `@vitejs/plugin-react`
  - `tailwindcss@4` + `@tailwindcss/vite`
  - 标准 `typescript-eslint` / `eslint` flat config
- `src/` 代码已不再依赖飞书容器组件与运行时；入口为普通 React 应用。
- 根目录构建命令现在是：
  - 开发：`npm run dev`
  - 类型检查：`npm run typecheck`
  - 生产构建：`npm run build`

## 当前已落地功能

- 任务系统：
  - `IQuestTask` 已扩展 `goalId`、`projectId`、`capabilityIds`
  - 悬赏池支持创建 / 编辑任务时关联目标、项目、能力
- 能力树系统：
  - 已替换为“个人成长能力树”
  - `skills` 支持 `proficiencyLevel`、`experience`、`lastImprovedAt`
  - 完成任务会给关联能力发经验，并在能力树详情侧栏展示成长信息
- 2.0 数据底座：
  - 已新增 `Goal / Project / Reflection`
  - 后端已落地 `goals / projects / reflections` 表与 CRUD API
  - 前端已有 `GoalsPage`、`ProjectsPage`、`ReflectionsPage`
- 项目联动：
  - 新增 `ProjectDetailPage`，路由为 `/projects/:id`
  - 项目详情页可查看项目任务、按任务完成比例计算进度
  - 可在项目详情页直接创建任务，并自动带上 `goalId / projectId / capabilityIds`
  - Today 页推荐卡可直接跳转到项目详情或悬赏池
- Today 推荐：
  - 已有“今日最高价值任务”
  - 已有“今日最大成长任务”
  - 支持一键设为追踪、加入注意力、查看任务入口

## 当前后端 / Electron 状态

- `server/index.js` 已支持：
  - `tasks` 表扩展 `goalId / projectId / capabilityIds`
  - `skills` 表扩展 `proficiencyLevel / experience / lastImprovedAt`
  - `goals / projects / reflections` 表
- Electron 当前关键状态：
  - `quest-guild-electron/main.js` 已支持自动拉起本地 `server/index.js`
  - 启动时优先尝试 `3001`，若占用则向上找可用端口
  - 渲染进程 API 代理会转发到实际后端端口
  - 生产环境悬浮窗统一走 `renderer/app/index.html?mode=floating`
- Electron 常用命令：
  - 开发启动：`quest-guild-electron\\npm run start`
  - 仅构建渲染端：`quest-guild-electron\\npm run build:renderer`
  - Windows 打包：`quest-guild-electron\\npm run build:win64`

## 本次修复记录

- 已修复 `server/index.js` 中 `skills` API 段落的重复 SQL 拼接错误。
- 根因：`/api/skills/batch-init`、`/api/skills`、`/api/skills/import` 代码块内误插入了重复的 SQL / 字段定义，导致 Node 在启动时出现 `SyntaxError: Invalid or unexpected token`。
- 这个错误会直接导致后端无法启动，进而让前端 Vite 开发环境出现一串 `/api/*` 的 `ECONNREFUSED` 代理报错。
- 修复后已验证：
  - `http://127.0.0.1:3001/api/tasks` 返回 `200`
  - `http://127.0.0.1:3001/api/goals` 返回 `200`
  - `http://127.0.0.1:3001/api/projects` 返回 `200`
  - `http://127.0.0.1:3001/api/settings` 返回 `200`
  - `http://127.0.0.1:5173/api/tasks` 通过 Vite proxy 返回 `200`

## 当前建议的继续方向

- 优先做 `Project -> Capability` 聚合：
  - 在项目详情页展示项目关联能力
  - 汇总该项目近 7 天能力经验增长
- 再做 `Goal -> Project -> Task -> Capability` 完整闭环：
  - 目标页显示项目进度汇总
  - Today 推荐引入目标权重与项目上下文
- 若继续增强 Electron：
  - 补主进程托管后端的健康检查与退出清理日志
  - 补开发模式下 Electron + Vite + local server 的一键联调脚本

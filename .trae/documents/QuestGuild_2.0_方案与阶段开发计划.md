# 悬赏任务公会 Quest Guild 2.0 方案与阶段开发计划（Plan）

## Summary

2.0 将产品从“游戏化任务管理工具”升级为「个人成长 RPG 操作系统」，以 Electron 桌面版为主要交付形态，并采用 **统一 API 架构**：首发默认使用本地托管的 server/SQLite 作为数据与业务中枢，同时保留未来切换到云后端的兼容路径（前端以渲染为主，可保留少量 UI 偏好/缓存）。

核心闭环（对齐 v1.0.1）：  
Goal（人生目标）→ Capability（能力树）→ Project（成长项目）→ Quest（任务）→ Action（执行/专注）→ Reward（声望/技能点/经验）→ Reflection（复盘）→ Recommendation（下一步建议）

本计划融合：  
- [悬赏任务.md](file:///e:/PersonalFiles/Coding/quest-guide/悬赏任务.md) 中已确认的 P0/P1 缺口与工程阻塞点（打包、悬浮窗同步、回顾符文、多轮引导、快捷语法等）  
- [悬赏任务_v1.0.1_优化版.md](file:///e:/PersonalFiles/Coding/quest-guide/悬赏任务_v1.0.1_优化版.md) 的产品升级想法（Goal/Capability/Project/Reflection/TaskPriority/时间预测/学习系统）  

并基于用户决策：Electron 优先、2.0 以 server+SQLite 为主干实现、信息架构允许新增但能整合则整合。

---

## Current State Analysis（基于仓库现状）

### 已实现（核心能力）
- 前端 6 页：Today/QuestPool/SkillTree/Shop/Stats/Settings（`src/pages/*`），Sidebar + Topbar 桌面骨架
- 任务：epic/daily、父子层级、Boss 进度条、stage 阶段字段、追踪任务计时、注意力任务（法力上限）
- 技能树：SVG 可拖拽/缩放，节点解锁/强化，技能点
- 商店：声望兑换 + 自定义商品 + 兑换记录
- 统计：近 7 天任务完成/专注时长/难度分布（echarts）
- 设置：manaMax/resetTime/sound + 悬浮窗偏好 + 备份/恢复/导入（覆盖/合并）
- 后端（`server/`）：Express + SQLite（WAL），任务/追踪/注意力/专注日志/技能/商店/设置/AI 拆解/Bootstrap 等 30+ API
- LLM：Ollama 与火山方舟豆包（OpenAI 兼容接口），单次拆解 subtasks（4-10 个、按 stage 分组）

### P0 阻塞问题（影响交付）
- `quest-guild-electron/package.json` 空文件（0 字节）→ Electron 依赖无法安装/打包不可用
- Electron 独立悬浮窗 `quest-guild-electron/renderer/float.html` 为硬编码 demo 数据，未同步主窗口/存储
- Electron 仅做 API proxy（固定 `localhost:3001`），但未管理 server 生命周期；若 2.0 首发采用本地托管后端，必须做到“随桌面启动”，同时避免把前端与固定本地地址写死耦合

### P1 产品缺口（影响 2.0 方向）
- 缺失：Goal / Project / Reflection / TaskPriority / 时间预测模型 / Learning Quest 输出机制
- 缺失：艾宾浩斯回顾符文系统
- 缺失：LLM 多轮引导式创建史诗任务（当前仅有一键拆解）
- 缺失：快捷录入自然语言语法（当前是表单式）

---

## 2.0 目标与成功标准（Success Criteria）

### 产品目标
- 用户每天打开应用不仅知道“做什么”，还知道“为什么做、做完提升什么、下一步推荐是什么”
- 任务从纯执行层升级为成长系统行动节点：任务 ↔ 项目 ↔ 目标 ↔ 能力 可追溯

### 成功标准（可验收）
- Electron 可一键启动：主窗口 + 悬浮窗可用；在“本地模式”下无需用户手动启动 server
- 核心业务通过统一 API 层读写；2.0 首发默认由 server/SQLite 承载任务、目标、项目、能力、声望、技能点、专注日志、复盘
- 成长闭环可跑通：
  - 目标 → 项目 → 任务：可创建并关联
  - 完成任务 → 声望/技能点/经验发放
  - 复盘可填写并在统计中回看
  - 今日页提供：最高价值任务 / 最大成长任务（至少 2 个推荐）
- 技能树升级为能力树（至少新增：能力等级、经验、最近提升时间、关联项目与任务）
- 统计页新增：时间预测准确率（预计 vs 实际），可按任务类型/标签/项目汇总

---

## Proposed Changes（2.0 方案设计）

### A. 交付与运行形态（Electron 优先 + 本地优先、云兼容）

#### A1. 统一后端接入模型（首发本地托管，后续可切云）
目标：2.0 首发让用户只需启动桌面应用即可使用完整能力；同时前端不与“本地 server”实现细节绑定，保留未来迁移云后端的兼容性。

架构原则：
- 前端始终只通过统一 API 层访问后端能力，不直接依赖 `localhost:3001`、本地文件路径或 SQLite 结构
- 后端业务规则与部署形态解耦：同一套领域逻辑既可运行在 Electron 本地托管模式，也可运行在云端部署模式
- 运行模式配置化：
  - `local`：Electron 主进程托管本地 server（2.0 首发默认）
  - `remote`：Electron 前端连接云端 API（后续版本可启用）

推荐方案（2.0 默认，local 模式）：
- **Electron 主进程托管 server**（同进程或可控子进程）：
  - 将 `server/index.js` 重构为“可复用模块”，避免 `require` 即监听端口（例如拆分为 `server/app.js` 导出 express app，`server/index.js` 仅负责启动）
  - Electron 启动时：
    - 选择端口：优先 3001；冲突时 fallback 到空闲端口
    - 记录 `serverPort`，并通过 `window.electronAPI` 暴露给渲染进程，或由主进程 proxy 统一转发
  - 将 Electron 的 `api:proxy` 从固定 `localhost:3001` 改为转发到“当前后端目标”（本地实际端口或远端 base URL）
- 退出策略：应用退出时确保 server 停止（避免端口占用与僵尸进程）

remote 模式预留要求：
- API 客户端支持配置 `baseURL`
- Settings 中预留“后端模式 / 服务地址”配置入口（可先隐藏为开发选项）
- 数据模型从 2.0 开始按多端/云端标准设计（如 `userId`、`createdAt`、`updatedAt`、软删除/同步友好主键策略）

备选方案（若不想改 server 结构）：
- Electron 主进程 spawn 子进程执行 `node server/index.js`（需要处理 packaged 环境下的可执行路径与资源定位）

#### A2. 悬浮窗统一为 React 渲染（消除 float.html 数据孤岛，P0）
目标：悬浮窗与主窗口共享同一套 UI 与数据源，天然同步。

方案：
- 将 floatWindow 生产环境加载页从 `renderer/float.html` 切换为 `renderer/app/index.html?mode=floating`
- 复用 `src/components/FloatingWidget.tsx` 与 `useFloatingMode()`（当前 Layout 已实现悬浮模式隐藏 Sidebar/Topbar）
- 2.0 起 `float.html` 仅保留为历史原型，不再作为默认入口（后续可删除）

#### A3. 恢复 Electron 打包能力（P0）
目标：能安装、能运行、能打包。

方案：
- 恢复 `quest-guild-electron/package.json`（基于 `quest-guild-electron/package-lock.json` 还原）
- 统一构建脚本（示例方向）：
  - 根：build 前端（renderer/app 产物）
  - Electron：dev/start（支持 local/remote 模式）、build（含 electron-builder 配置）
- 打包产物包含：
  - Electron 主进程（main/preload）
  - renderer/app（前端构建产物）
  - server/（后端代码 + SQLite 初始化/迁移逻辑）
  - assets/icon（实际存在的图标文件）

---

### B. 数据模型 2.0（统一领域模型，2.0 首发以 server/SQLite 为真源）

#### B1. 新增实体（对齐 v1.0.1）
新增 4 类核心实体：Goal / Project / Capability（能力树升级）/ Reflection。

建议 DB Schema（以增量迁移落地）：
- goals
  - id, name, description, deadline, status, createdAt, updatedAt
- projects
  - id, goalId, name, description, capabilityIds(JSON), progress(0-100), status, createdAt, updatedAt
- reflections
  - id, taskId, expectedResult, actualResult, lessonLearned, nextAction, createdAt
- skills 表升级为 capabilities（2.0 可先保留表名 skills，语义对外称 Capability）
  - 新增：proficiencyLevel(0-5)、experience、lastImprovedAt、dimension(knowledge/practice/system/output)、relatedProjectIds(JSON)
  - 保留：category、parentId、x/y/icon、requiredSkillPoints、status（保留“解锁”系统，同时扩展“成长等级/经验”系统）

#### B2. Task 模型扩展（关联链路 + TaskPriority + 学习输出 + 时间预测）
对 tasks 表新增字段（以 ALTER TABLE 迁移）：
- 关联链路：goalId、projectId、capabilityIds(JSON)
- TaskPriority：impact、growthValue、urgency、energyCost、priorityScore
- 学习系统：taskKind(learn/build/maintain/other)、outputRequired(JSON/TEXT)、outputSubmitted(JSON/TEXT)、reviewPlan(JSON/TEXT)
- 时间预测：categoryKey/tagKey（用于按类别统计偏差系数）

一致性要求：
- `priorityScore` 的计算在后端实现为权威公式（前端仅展示），避免多端不一致
- 新增实体与表字段从 2.0 起按云兼容标准设计：预留 `userId`、`createdAt`、`updatedAt`，避免把“单机唯一状态”写进核心业务假设

#### B3. API 扩展（server/index.js）
新增/扩展 API（建议方向）：
- Goals：CRUD `/api/goals`、按状态/截止日期查询、Goal 概览统计
- Projects：CRUD `/api/projects`、按 goalId 查询、Project 进度更新、Project 关联任务列表
- Reflections：CRUD `/api/reflections`、按 taskId 查询、最近复盘列表
- Capabilities：在现有 skills API 基础上扩展字段读写；新增“经验发放/等级提升”端点（或在任务完成时自动结算）
- Tasks：
  - create/update 支持 goalId/projectId/capabilityIds/priority 字段
  - 完成任务时：写入 reflections（可选）、发放 capability 经验（按任务配置或默认规则）
- Stats：
  - 新增 `/api/stats/summary`、`/api/stats/daily`、`/api/stats/time-accuracy`（预计 vs 实际）
  - 新增 `/api/today/recommendations`（最高价值/最大成长/预计可完成时间）

#### B4. 迁移与兼容策略
考虑已有数据（tasks/skills/shop/meta/active_track/focus_logs）：
- 2.0 采用增量迁移：
  - 先为现有表补齐新列（默认值）
  - 新增 goals/projects/reflections 表
- 默认行为：
  - 旧任务无 goalId/projectId/capabilityIds → 允许为空（后续可引导补全）
  - 能力等级（proficiencyLevel/experience）默认 0/0

---

### C. 前端信息架构与页面调整（允许新增但能整合则整合）

原则：保持现有 6 页可继续作为“任务操作面板”，新增页面用于承载 2.0 的“方向层/成长层”，避免把所有内容塞进一个页面导致复杂度爆炸。

建议新增页面（一级）：
- `/goals` 目标（Goal）页：目标列表 + 详情 + 进度 + 关联项目
- `/projects` 项目（Project）页：项目列表 + 与目标/能力的关系 + 项目任务面板
- `/reflections` 复盘（Reflection）页：按时间线聚合复盘，支持筛选项目/能力/任务

原有页面升级方向：
- Today：增加“每日决策辅助”（推荐任务、核心/辅助/可选配额）与“今日预计总耗时”
- QuestPool：任务创建/编辑增加 Goal/Project/Capability/TaskPriority 字段；列表支持按 priorityScore 排序
- SkillTree：升级为 Capability Tree（显示能力等级/经验/最近提升时间），并提供“成长路径/下一步建议”
- Stats：增加时间预测准确率、决策质量（基于 priority 与复盘字段的可解释指标）
- Settings：新增 server 运行状态/后端模式/服务地址/LLM 配置入口（2.0 首发可先隐藏 remote 模式入口）

---

### D. 关键 2.0 玩法升级（对齐 v1.0.1）

#### D1. TaskPriority（智能排序）
数据：
- impact / growthValue / urgency / energyCost → priorityScore

交互：
- 任务创建/编辑时可填写四项（0-5 或 0-10 量表）
- 列表支持“按优先级排序”，Today/QuestPool 都可使用

#### D2. 每日决策辅助（Today 推荐）
目标：回答 v1.0.1 的 4 个核心问题之一：“下一步最值得投入什么？”

输出：
- 今日最高价值任务（priorityScore 最高且可完成）
- 最大成长任务（growthValue 权重最高，或能力提升潜力最高）
- 预计完成时间：基于时间预测模型（见 D4）
- 配额提示：今日核心 1 / 辅助 2 / 可选 3（可配置）

#### D3. Learning Quest（学习任务输出机制）
目标：学习任务不能只“阅读完成”，必须产生输出。

建议结构（最小可用）：
- 对 learn 类型任务，提供模板字段：
  - Input：学习内容（已有 description）
  - Output：总结输出（必填）
  - Practice：实践产出（可选/必填）
  - Review：复习计划（生成回顾符文的输入）

#### D4. 时间预测模型（预计 vs 实际）
目标：回答 v1.0.1 的核心问题：“我的时间判断是否准确？”

实现方向：
- 记录：estimatedMinutes vs 实际（追踪任务来自 active_track 结算；注意力任务可选记录实际分钟或默认 0）
- 统计：按 taskKind / 标签 / 项目 / 能力 维度输出偏差系数（例如：学习任务平均低估 60%）
- 应用：创建任务时给出“建议预估时间”（estimatedMinutes 推荐值），并提示历史偏差

#### D5. Reflection（复盘）
目标：回答“我的成长是否持续发生？下次如何调整？”

最小闭环：
- 完成任务时弹出（可跳过）：expectedResult / actualResult / lessonLearned / nextAction
- 复盘页可回看；统计页可做“决策质量”指标（例如：高 priority 任务是否达成预期）

---

## 阶段开发计划（里程碑 / P0-P2）

> 每个阶段都包含：交付物、核心改动范围、验收标准、风险与对策。

### Milestone 0（P0）：工程可交付化与统一后端接入闭环
交付物：
- Electron 可安装/可运行/可打包（修复空 package.json）
- Electron 建立统一后端接入层：local 模式可用，remote 模式接口预留完成
- Electron 启动即具备可用本地后端（local 模式），无需手动启动
- 悬浮窗使用 React SPA 渲染，数据与主窗口同步（弃用 float.html 作为入口）

核心改动范围（按文件定位）：
- `quest-guild-electron/package.json`：恢复依赖与脚本、electron-builder 配置
- `quest-guild-electron/main.js`：托管 server、动态端口或远端 base URL、floatWindow 加载 SPA、完善 tray/icon 资源路径
- `quest-guild-electron/preload.js` + `src/types/electron.d.ts`：补充后端模式 / serverPort / health 等桥接信息（如需要）
- `src/api/*`：抽象 baseURL 与 transport，不再写死本地地址
- `server/index.js`：重构为可复用启动方式（若采用同进程托管）

验收标准：
- 从 release 包双击启动：主窗口可用、悬浮窗可展开、任务读写正常、AI 拆解可调用（配置正确时）
- local 模式下无需用户另开终端启动 server
- API 客户端可切换后端目标，不依赖固定 `localhost:3001`

主要风险与对策：
- 风险：server 在 packaged 环境路径/端口冲突  
  - 对策：启动时检测端口占用并 fallback；提供 `/api/health` 探活；electron 内记录实际目标地址

---

### Milestone 1（P1）：成长操作系统的数据底座（Goal/Project/Capability/Reflection）
交付物：
- server/SQLite 增量迁移：新增 goals/projects/reflections；skills 扩展能力成长字段；tasks 扩展关联字段
- 前端新增 Goals/Projects/Reflections 页面（一级导航），但与现有任务页形成顺畅跳转
- 任务可绑定目标/项目/能力；完成任务可记录复盘（可跳过）

核心改动范围：
- `server/index.js`：新增 goals/projects/reflections API；扩展 tasks API 字段；完善 stats 的基础 endpoint（至少 summary）
- `src/api/*`：新增 goals/projects/reflections 客户端；扩展 tasks/skills API
- `src/types/*`：新增 Goal/Project/Reflection 类型；扩展 IQuestTask/ISkillNode（或新建类型以避免破坏现有）
- `src/pages/*`：新增 GoalsPage/ProjectsPage/ReflectionsPage；现有 QuestPool/Today 的创建编辑弹窗增加关联字段
- `src/components/AppSidebar.tsx`：新增导航项（必要时）

验收标准：
- 可创建目标 → 创建项目 → 创建任务并关联 → 完成任务写复盘 → 在复盘页可回看
- 能力树节点具备“成长字段”（等级/经验/最近提升时间）并可在 UI 展示

---

### Milestone 2（P1）：决策与反馈系统（TaskPriority / 今日推荐 / 时间预测）
交付物：
- TaskPriority：任务价值四维度输入与排序
- Today 决策辅助：最高价值/最大成长/预计总耗时、核心/辅助/可选配额提示
- 时间预测准确率统计：按 taskKind/标签/项目维度输出偏差，并在创建任务时给出建议

核心改动范围：
- `server/index.js`：priorityScore 计算与持久化；新增 recommendations 与 time-accuracy endpoints
- `src/pages/Today/TodayPage.tsx`：新增推荐区块与配额提示
- `src/pages/QuestPool/QuestPoolPage.tsx`：新增优先级字段编辑与排序
- `src/pages/Stats/StatsPage.tsx`：新增时间预测准确率图表/指标

验收标准：
- Today 页面可稳定输出推荐结果，并可一键将推荐任务设为追踪/注意力
- 统计页可看到“预计 vs 实际”偏差分布，并能用于新任务预估提示

---

### Milestone 3（P2）：AI 智能化与学习系统增强
交付物（择优进入 2.0 后半段）：
- LLM 多轮引导创建史诗任务（替代“单次拆解”）
- Learning Quest：输出/实践/复习计划模板化（并与回顾符文联动）
- 艾宾浩斯回顾符文：按能力节点/学习任务生成复习任务（1/2/4/7/15/30 天…）

核心改动范围：
- `server/services/llm.js`：新增对话状态管理/分步 prompt（可先做服务端状态机）
- `server/index.js`：新增 review 任务生成、复习队列与完成奖励结算
- 前端：学习任务表单增强、回顾任务标记与完成交互、能力节点“强化光环/枯萎”视觉

验收标准：
- 学习任务完成必须提交输出（可配置“允许跳过”）
- 回顾任务按计划出现并可完成，能力节点状态变化可见

---

## Assumptions & Decisions（已锁定与待确认）

已锁定：
- Electron 优先交付
- 2.0 首发以 server+SQLite 为主干实现，但前端采用统一 API 层并保留未来切云路径
- 信息架构允许新增页面

待在执行前进一步锁定（不阻塞本计划，但会影响实现细节）：
- Electron 托管 server 的具体方式：同进程嵌入 vs 子进程 spawn
- 后端模式切换策略：仅内部配置 vs 暴露给用户
- 端口策略：固定 3001 vs 动态端口 + 发现机制
- 能力树升级是否需要“领域/维度”完整模型（knowledge/practice/system/output）在 2.0 首发即落地，还是先占位字段

---

## Verification（验证步骤）

### 工程验证（P0）
- Electron dev：启动主进程后自动启动 server；主窗口与悬浮窗均能正常请求 API
- Electron prod：构建 + 打包后，安装包启动后同样可用；`/api/health` 可用

### 业务验证（P1-P2）
- 创建 Goal → Project → Task 关联链路完整，CRUD 正常
- 完成追踪任务：active_track 结算、focus_logs 写入、reputation/skill_points 更新
- Reflection 写入与查询正常
- TaskPriority 排序与 Today 推荐稳定输出
- 时间预测统计能基于历史数据产生偏差结论并影响建议预估

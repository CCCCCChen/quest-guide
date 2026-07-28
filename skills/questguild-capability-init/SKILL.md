---
name: questguild-capability-init
description: 初始化 QuestGuild 个人成长能力树，包含计算机科学、数学、人工智能、金融、健身、产品商业、元能力等 7 大分类的完整技能节点。
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 07a2a1df9b193b364f801ea9464446c5_0aa5ad758a6411f1a093525400287e28
    ReservedCode1: dejOocyPs6Tq6uECSj+CUe/b6YqH2h+XS/U16CP4wf3rdiDJ5Wf4MXSVqWNcWoMs8eAxsoBBF2Yu33q+u4xehzuXrg0S5HQHwRvG597kP4jVRdY756ByC6CfmZ1lIMXgIuTlotlv4wpppisrfTuG/p+aG4B7REcXPd6LiNMm6okpHi4AkqdIck0Ir04=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 07a2a1df9b193b364f801ea9464446c5_0aa5ad758a6411f1a093525400287e28
    ReservedCode2: dejOocyPs6Tq6uECSj+CUe/b6YqH2h+XS/U16CP4wf3rdiDJ5Wf4MXSVqWNcWoMs8eAxsoBBF2Yu33q+u4xehzuXrg0S5HQHwRvG597kP4jVRdY756ByC6CfmZ1lIMXgIuTlotlv4wpppisrfTuG/p+aG4B7REcXPd6LiNMm6okpHi4AkqdIck0Ir04=
---



# QuestGuild 能力树初始化 Skill

当用户请求初始化 QuestGuild 技能/能力数据时，根据以下分类生成 Skill 数据。

## 前置条件

后端必须已启动（`npm run dev`）。所有 API 调用通过本 Skill 目录下的 `insert_api.py` 完成。

```python
import sys; sys.path.insert(0, r'E:\PersonalFiles\Coding\quest-guide\skills\questguild-capability-init')
from insert_api import Skill, Goal, Project, Task
```

目标：

建立用户个人成长能力树（Capability Tree），作为 Goal、Project、Task 的关联基础。

---

# Skill 数据结构

```python
Skill.insert(
    name: str,           # 技能名称（必填）
    category: str,       # 分类（必填）: computer/math/ai/finance/fitness/business/meta
    parent_id: str = None,  # 父节点 ID
    level: int = 0,      # 等级 0-5
    description: str = "",
    x: float = 0.0,      # 能力树 X 坐标
    y: float = 0.0,      # 能力树 Y 坐标
    required_sp: int = 1, # 解锁所需技能点
)

# 返回: {"ok": True, "data": {"id": "sk_xxx", ...}} 或 {"ok": False, "error": "..."}
```

---

# 能力树初始化内容

## 1. 计算机科学（Computer Science）

Category:

```
computer
```

Tree:

```
计算机科学
│
├── 编程基础
│   ├── Python
│   ├── JavaScript
│   ├── TypeScript
│   ├── 数据结构
│   └── 算法基础
│
├── 软件工程
│   ├── 代码规范
│   ├── 软件测试
│   ├── Git版本控制
│   ├── 软件架构
│   └── 工程实践
│
├── 后端开发
│   ├── API设计
│   ├── 数据库设计
│   ├── 微服务
│   ├── 性能优化
│   └── 分布式系统
│
├── 前端开发
│   ├── HTML/CSS
│   ├── React
│   ├── Electron
│   └── 用户体验设计
│
└── DevOps
    ├── Docker
    ├── CI/CD
    ├── Linux
    ├── 云服务
    └── 系统监控
```

---

# 2. 数学（Mathematics）

Category:

```
math
```

Tree:

```
数学
│
├── 基础数学
│   ├── 代数
│   ├── 几何
│   ├── 函数
│   └── 数学证明
│
├── 离散数学
│   ├── 集合论
│   ├── 图论
│   ├── 逻辑
│   └── 组合数学
│
├── 统计数学
│   ├── 概率论
│   ├── 数理统计
│   ├── 贝叶斯方法
│   └── 数据分析
│
└── 高级数学
    ├── 线性代数
    ├── 微积分
    ├── 优化理论
    └── 信息论
```

---

# 3. 人工智能（Artificial Intelligence）

Category:

```
ai
```

Tree:

```
人工智能
│
├── AI基础
│   ├── Machine Learning
│   ├── Deep Learning
│   ├── 神经网络
│   └── 模型训练
│
├── 大语言模型
│   ├── Transformer
│   ├── Embedding
│   ├── Prompt Engineering
│   └── Fine-tuning
│
├── AI应用工程
│   ├── RAG
│   ├── Vector Database
│   ├── Agent
│   ├── AI Workflow
│   └── MCP
│
├── AI产品设计
│   ├── AI场景分析
│   ├── 人机协作设计
│   ├── AI体验设计
│   └── AI商业应用
│
└── AI系统架构
    ├── LLM应用架构
    ├── AI基础设施
    ├── 模型部署
    └── AI系统优化
```

---

# 4. 金融（Finance）

Category:

```
finance
```

Tree:

```
金融
│
├── 金融基础
│   ├── 货币
│   ├── 利率
│   ├── 通货膨胀
│   └── 金融市场
│
├── 投资能力
│   ├── 股票分析
│   ├── 债券
│   ├── 基金
│   └── 资产配置
│
├── 财务分析
│   ├── 财务报表
│   ├── 企业估值
│   ├── 成本分析
│   └── 商业模式分析
│
└── 财富管理
    ├── 风险管理
    ├── 长期投资
    ├── 被动收入
    └── 财富规划
```

---

# 5. 健身（Fitness）

Category:

```
fitness
```

Tree:

```
健身
│
├── 身体基础
│   ├── 睡眠管理
│   ├── 饮食管理
│   ├── 体重管理
│   └── 恢复能力
│
├── 力量训练
│   ├── 深蹲
│   ├── 硬拉
│   ├── 卧推
│   └── 肌肉增长
│
├── 运动能力
│   ├── 心肺能力
│   ├── 柔韧性
│   ├── 灵活性
│   └── 运动表现
│
└── 健康管理
    ├── 习惯建立
    ├── 压力管理
    └── 长期健康
```

---

# 6. 产品与商业（Product & Business）

Category:

```
business
```

Tree:

```
产品商业
│
├── 产品设计
│   ├── 用户需求分析
│   ├── 产品规划
│   ├── MVP设计
│   └── 产品迭代
│
├── 商业能力
│   ├── 商业模式
│   ├── 市场分析
│   ├── 用户价值
│   └── 成本收益分析
│
└── 创业能力
    ├── 项目管理
    ├── 资源管理
    ├── 战略规划
    └── 创新能力
```

---

# 7. 通用成长能力（Meta Capability）

Category:

```
meta
```

Tree:

```
元能力
│
├── 思考能力
│   ├── 第一性原理
│   ├── 结构化思考
│   ├── 问题拆解
│   └── 决策能力
│
├── 学习能力
│   ├── 阅读
│   ├── 知识整理
│   ├── 输出能力
│   └── 教学能力
│
├── 自我管理
│   ├── 目标管理
│   ├── 时间管理
│   ├── 专注能力
│   └── 复盘能力
│
└── 沟通表达
    ├── 写作
    ├── 技术表达
    ├── 演讲
    └── 影响力
```

---

# 初始化规则

插入顺序：

1. 创建一级节点
2. 获取一级节点 ID
3. 创建二级节点
4. 创建三级节点
5. 保存 parent_id 关系

示例：

```python
import sys; sys.path.insert(0, r'E:\PersonalFiles\Coding\quest-guide\skills\questguild-capability-init')
from insert_api import Skill

# 1. 创建一级节点
res = Skill.insert(name="计算机科学", category="computer", level=0)
computer_id = res["data"]["id"]  # 从返回的 data.id 提取

# 2. 创建二级节点
res = Skill.insert(name="编程基础", category="computer", parent_id=computer_id, level=0)
prog_id = res["data"]["id"]

# 3. 创建三级节点
Skill.insert(name="Python", category="computer", parent_id=prog_id, level=0)
```

---

# 默认等级规则

```
Level 0:
未学习

Level 1:
了解概念

Level 2:
可以使用

Level 3:
独立完成项目

Level 4:
优化和设计

Level 5:
专家和教学
```

---

# 后续自动关联

Task 完成后：

根据 task.skill_id：

增加：

* Skill XP
* Skill Level
* Capability Progress

例如：

完成：

"实现 RAG 知识库"

奖励：

```
AI应用工程 +20 XP
RAG +30 XP
系统设计 +10 XP
```

形成：

Task → Skill → Capability → Goal

成长闭环。
*（内容由AI生成，仅供参考）*

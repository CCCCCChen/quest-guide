/**
 * LLM 统一封装
 * 支持：火山方舟（豆包）、Ollama 本地部署
 * 统一 OpenAI 兼容格式调用
 */

const SYSTEM_PROMPT = `你是资深项目管理专家，擅长将复杂目标拆解为结构清晰、可执行的子任务，并按依赖关系划分执行阶段。

## 核心任务
将用户给出的大任务拆解为 4-10 个子任务，按执行阶段（stage）分组，**由你独立估算每个子任务的实际耗时**。

## 阶段划分规则（stage）
- stage 从 1 开始连续编号
- **同一 stage 的任务互相无依赖，可以并行执行**
- **不同 stage 必须按顺序执行**：前一阶段所有任务完成后，才能开始下一阶段
- 阶段划分依据：工作流顺序、前置依赖关系、产出物先后
- 阶段数量控制在 2-5 个之间

## 子任务质量要求
1. **颗粒度**：单任务 20-120 分钟可完成，太小的合并，太大的再拆
2. **可执行**：以动词开头，有明确的动作和产出，不能是模糊的概念
   - ✅ 好："编写数据库表结构设计文档"
   - ❌ 差："数据库相关工作"
3. **独立性**：每个子任务可以独立交付和验收
4. **难度与时间对齐**：
   - easy：20-30分钟，简单机械操作
   - normal：30-60分钟，常规工作
   - hard：60-90分钟，需要思考或多方协作
   - epic：90-120分钟，复杂或探索性工作

## 时间估算规则（重点）
1. **从实际出发**：考虑环境准备、上下文切换、调试、沟通验证等隐性成本，不要过于乐观
2. **最小 20 分钟**：任何任务至少 20 分钟，**绝对不要出现 5、10、15 分钟这种过短的估算**
3. **按难度对齐基准**：easy≈25 / normal≈45 / hard≈75 / epic≈100，根据实际复杂度上下浮动
4. **不要平均分配**：每个子任务根据自身复杂度独立估算
5. 主任务给出的预估时间仅作参考，**以你判断的实际工作量为准**

## 输出格式（纯 JSON，无其他文字）
{
  "subtasks": [
    {
      "name": "子任务名称（动词开头，简洁明确）",
      "description": "一句话说明做什么、产出什么",
      "difficulty": "normal",
      "estimatedMinutes": 45,
      "stage": 1
    }
  ]
}`;

async function callLLM(userPrompt) {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || (provider === 'ollama' ? 'qwen2:7b' : 'doubao-pro-32k');
  const baseURL = process.env.LLM_BASE_URL || (provider === 'ollama'
    ? 'http://localhost:11434/v1'
    : 'https://ark.cn-beijing.volces.com/api/v3');

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  };

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM 调用失败 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(content);
    if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
      throw new Error('返回格式不对');
    }
    return parsed.subtasks;
  } catch (e) {
    // 尝试提取 JSON
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.subtasks) return parsed.subtasks;
    }
    throw new Error('LLM 返回内容解析失败: ' + content.slice(0, 200));
  }
}

/**
 * 拆解任务
 * @param {Object} task - { name, description, difficulty, type }
 * @returns {Promise<Array>} 子任务列表
 */
async function decomposeTask(task) {
  const userPrompt = `请拆解以下任务：

【任务名称】${task.name}
【任务描述】${task.description || '无'}
【任务类型】${task.type || 'daily'}
【难度等级】${task.difficulty || 'normal'}
【总预计耗时】${task.estimatedMinutes || 30} 分钟（子任务总和必须约等于此数值）

请按阶段拆解，输出纯 JSON。`;

  const subtasks = await callLLM(userPrompt);

  // 规范化字段
  return subtasks.map((st, idx) => ({
    name: String(st.name || `子任务 ${idx + 1}`).trim(),
    description: String(st.description || '').trim(),
    difficulty: ['easy', 'normal', 'hard', 'epic'].includes(st.difficulty) ? st.difficulty : 'normal',
    estimatedMinutes: parseInt(st.estimatedMinutes, 10) || 30,
    stage: parseInt(st.stage, 10) || 1,
    type: task.type === 'epic' ? 'epic' : 'daily',
  }));
}

module.exports = { decomposeTask, callLLM };

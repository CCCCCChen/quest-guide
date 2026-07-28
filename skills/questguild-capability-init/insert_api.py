"""
QuestGuild 数据插入 API 模块
供 LLM 通过 python_executor 直接调用，所有函数返回 dict，key 为 "ok"/"error"/"data"

用法示例:
  import sys; sys.path.insert(0, r'E:\PersonalFiles\Coding\quest-guide\skills\questguild-capability-init')
  from insert_api import Goal, Project, Task, Skill, Reflection, ShopItem

  Goal.insert(name="掌握Python", description="看完《流畅的Python》")
  Project.insert(name="练习项目", goal_id="g_xxx")
  Task.insert(name="写100行代码", difficulty="normal", est_min=30)
  Skill.insert(name="Python", category="computer", parent_id="sk_xxx")
"""

import json, random, string, time as _time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

API_BASE = "http://localhost:3001"

# ── 工具函数 ──────────────────────────────────────────

_BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz"

def _base36(n: int) -> str:
    if n == 0:
        return "0"
    s = []
    while n:
        n, r = divmod(n, 36)
        s.append(_BASE36[r])
    return "".join(reversed(s))

def _gen_id(prefix: str) -> str:
    """模拟服务端 genId: {prefix}_{timestamp36}_{random4}"""
    ts = _base36(int(_time.time() * 1000))
    rand = "".join(random.choices(string.digits + string.ascii_lowercase, k=4))
    return f"{prefix}_{ts}_{rand}"


def _call(method, path, data=None):
    url = f"{API_BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req) as resp:
            return {"ok": True, "data": json.loads(resp.read())}
    except HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}", "detail": e.read().decode(errors="replace")}
    except URLError as e:
        return {"ok": False, "error": "后端未启动", "detail": str(e.reason)}


class Goal:
    """目标 - 必填 name（字符串），可选 description、deadline（毫秒时间戳）"""

    @staticmethod
    def insert(name: str, description: str = "", deadline: int = None):
        body = {"name": name, "description": description}
        if deadline:
            body["deadline"] = deadline
        return _call("POST", "/api/goals", body)

    @staticmethod
    def list():
        return _call("GET", "/api/goals")


class Project:
    """项目 - 必填 name，可选 goalId、description、progress(0-100)"""

    @staticmethod
    def insert(name: str, goal_id: str = None, description: str = "", progress: int = 0):
        body = {"name": name, "description": description, "progress": progress}
        if goal_id:
            body["goalId"] = goal_id
        return _call("POST", "/api/projects", body)

    @staticmethod
    def list(goal_id: str = None):
        path = f"/api/projects?goalId={goal_id}" if goal_id else "/api/projects"
        return _call("GET", path)


class Task:
    """
    任务 - 必填 name，type(daily/epic)，difficulty(easy/normal/hard/epic)，est_min(分钟)
    可选 goal_id, project_id, description, tags(列表), skill_id, boss_name（史诗任务Boss名）
    """

    @staticmethod
    def insert(
        name: str,
        task_type: str = "daily",
        difficulty: str = "normal",
        est_min: int = 30,
        goal_id: str = None,
        project_id: str = None,
        description: str = "",
        tags: list = None,
        skill_id: str = None,
        boss_name: str = None,
    ):
        body = {
            "name": name,
            "type": task_type,
            "difficulty": difficulty,
            "estimatedMinutes": est_min,
            "description": description,
        }
        if goal_id: body["goalId"] = goal_id
        if project_id: body["projectId"] = project_id
        if tags: body["tags"] = tags
        if skill_id: body["relatedSkillId"] = skill_id
        if boss_name: body["bossName"] = boss_name
        return _call("POST", "/api/tasks", body)

    @staticmethod
    def list():
        return _call("GET", "/api/tasks")


class Reflection:
    """复盘 - 必填 task_id，可选 expected_result, actual_result, lesson_learned, next_action"""

    @staticmethod
    def insert(
        task_id: str,
        expected_result: str = "",
        actual_result: str = "",
        lesson_learned: str = "",
        next_action: str = "",
    ):
        body = {
            "taskId": task_id,
            "expectedResult": expected_result,
            "actualResult": actual_result,
            "lessonLearned": lesson_learned,
            "nextAction": next_action,
        }
        return _call("POST", "/api/reflections", body)

    @staticmethod
    def list(task_id: str = None):
        path = f"/api/reflections?taskId={task_id}" if task_id else "/api/reflections"
        return _call("GET", path)


class Skill:
    """
    技能/能力节点 - 必填 name、category
    可选 parent_id, level(0-5), description, x, y, required_sp

    服务端 API: POST /api/skills，必填 id/name/category，id 由本模块自动生成
    """

    @staticmethod
    def insert(
        name: str,
        category: str,
        parent_id: str = None,
        level: int = 0,
        description: str = "",
        x: float = 0.0,
        y: float = 0.0,
        required_sp: int = 1,
    ):
        skill_id = _gen_id("sk")
        body = {
            "id": skill_id,
            "name": name,
            "category": category,
            "level": level,
            "description": description,
            "x": x,
            "y": y,
            "requiredSkillPoints": required_sp,
            "status": "locked",
        }
        if parent_id:
            body["parentId"] = parent_id
        return _call("POST", "/api/skills", body)

    @staticmethod
    def list():
        return _call("GET", "/api/skills")


class ShopItem:
    """商店商品 - 必填 name、cost(声望价格)、icon"""

    @staticmethod
    def insert(name: str, cost: int, icon: str = "gift", description: str = ""):
        body = {"name": name, "cost": cost, "icon": icon, "description": description}
        return _call("POST", "/api/shop/items", body)

    @staticmethod
    def list():
        return _call("GET", "/api/shop/items")

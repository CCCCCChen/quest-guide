"""
QuestGuild 数据注入脚本
通过后端 API 向本地数据库插入目标 / 项目 / 任务 / 复盘 / 商店商品

用法:
  python insert_data.py                   交互式逐条输入
  python insert_data.py --batch <文件>    从 JSON 文件批量导入

依赖: pip install requests
"""

import json, sys, os, time
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

API_BASE = os.environ.get("QUEST_GUILD_API", "http://localhost:3001")

# ── 请求工具 ──────────────────────────────────────────────

def _request(method: str, path: str, data: dict = None):
    url = f"{API_BASE}{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"  [失败] HTTP {e.code}: {err}")
        return None
    except URLError as e:
        print(f"  [失败] 无法连接后端 ({url}): {e.reason}")
        return None

def get(path: str):
    return _request("GET", path)

def post(path: str, data: dict):
    return _request("POST", path, data)

def delete(path: str):
    return _request("DELETE", path)

# ── 健康检查 ──────────────────────────────────────────────

def check_health():
    print(f"  后端地址: {API_BASE}")
    res = get("/api/health")
    if res and res.get("status") == "ok":
        print("  [OK] 后端已启动")
        return True
    print("  [错误] 后端不可用，请先启动 npm run dev")
    return False

# ── 数据列表查询（辅助显示） ────────────────────────────

def list_goals():
    goals = get("/api/goals")
    if goals:
        for g in goals:
            print(f"    {g['id']}: {g['name']}  [{g['status']}]")
    return goals or []

def list_projects():
    projects = get("/api/projects")
    if projects:
        for p in projects:
            print(f"    {p['id']}: {p['name']}  [{p['status']}]")
    return projects or []

def list_tasks():
    tasks = get("/api/tasks")
    if tasks:
        for t in tasks:
            print(f"    {t['id']}: {t['name']}  [{t['difficulty']}] {'[完成]' if t['status']=='completed' else ''}")
    return tasks or []

def list_skills():
    skills = get("/api/skills")
    if skills:
        for s in skills:
            print(f"    {s['id']}: {s['name']}  [{s['category']}] [{s['status']}]")
    return skills or []

# ── 插入函数 ──────────────────────────────────────────────

def insert_goal():
    print("\n--- 新建目标 ---")
    name = input("  目标名称: ").strip()
    if not name: return print("  已取消")
    desc = input("  描述 (可选): ").strip()
    deadline_str = input("  截止日期 (可选, 格式 2026-12-31): ").strip()
    deadline = None
    if deadline_str:
        parts = deadline_str.split("-")
        if len(parts) == 3:
            deadline = int(time.mktime((int(parts[0]), int(parts[1]), int(parts[2]), 0, 0, 0, 0, 0, 0)) * 1000)
    res = post("/api/goals", {
        "name": name,
        "description": desc,
        "deadline": deadline,
    })
    if res:
        print(f"  [OK] 目标已创建: {res['id']}")

def insert_project():
    print("\n--- 新建项目 ---")
    name = input("  项目名称: ").strip()
    if not name: return print("  已取消")
    desc = input("  描述 (可选): ").strip()

    goal_id = input("  关联目标ID (可选, 留空查看列表): ").strip()
    if not goal_id:
        list_goals()
        goal_id = input("  关联目标ID (可选): ").strip()

    res = post("/api/projects", {
        "name": name,
        "description": desc,
        "goalId": goal_id or None,
    })
    if res:
        print(f"  [OK] 项目已创建: {res['id']}")

def insert_task():
    print("\n--- 新建任务 ---")
    name = input("  任务名称: ").strip()
    if not name: return print("  已取消")

    desc = input("  描述 (可选): ").strip()

    print("  任务类型: 1=日任务(daily)  2=史诗任务(epic)")
    t = input("  选择 (1/2, 默认 1): ").strip()
    task_type = "epic" if t == "2" else "daily"

    print("  难度: 1=简单  2=普通  3=困难  4=史诗")
    d = input("  选择 (1-4, 默认 2): ").strip()
    diff_map = {"1": "easy", "2": "normal", "3": "hard", "4": "epic"}
    difficulty = diff_map.get(d, "normal")

    est = input("  预计耗时 (分钟): ").strip()
    estimated_minutes = int(est) if est.isdigit() else 30

    goal_id = input("  关联目标ID (可选, 留空查看列表): ").strip()
    if goal_id == "":
        list_goals()
        goal_id = input("  关联目标ID (可选): ").strip()

    project_id = input("  关联项目ID (可选, 留空查看列表): ").strip()
    if project_id == "":
        list_projects()
        project_id = input("  关联项目ID (可选): ").strip()

    tags_raw = input("  标签 (可选, 逗号分隔): ").strip()
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []

    skill_id = input("  关联能力ID (可选, 留空查看列表): ").strip()
    if skill_id == "":
        list_skills()
        skill_id = input("  关联能力ID (可选): ").strip()

    res = post("/api/tasks", {
        "name": name,
        "description": desc,
        "type": task_type,
        "difficulty": difficulty,
        "estimatedMinutes": estimated_minutes,
        "goalId": goal_id or None,
        "projectId": project_id or None,
        "tags": tags,
        "relatedSkillId": skill_id or None,
    })
    if res:
        print(f"  [OK] 任务已创建: {res['id']} (声望+{res['rewardReputation']}, 技能点+{res['rewardSkillPoints']})")

def insert_reflection():
    print("\n--- 新建复盘 ---")
    print("  选择已完成的任务:")
    list_tasks()
    task_id = input("  任务ID: ").strip()
    if not task_id: return print("  已取消")

    er = input("  预期结果: ").strip()
    ar = input("  实际结果: ").strip()
    ll = input("  经验教训: ").strip()
    na = input("  下一步行动: ").strip()

    res = post("/api/reflections", {
        "taskId": task_id,
        "expectedResult": er,
        "actualResult": ar,
        "lessonLearned": ll,
        "nextAction": na,
    })
    if res:
        print(f"  [OK] 复盘已创建: {res['id']}")

def insert_shop_item():
    print("\n--- 新建商品 ---")
    name = input("  商品名称: ").strip()
    if not name: return print("  已取消")
    cost = input("  声望价格: ").strip()
    if not cost.isdigit(): return print("  价格必须为数字")
    icon = input("  图标名称 (如 coffee, book, gift): ").strip() or "gift"
    desc = input("  描述 (可选): ").strip()
    res = post("/api/shop/items", {
        "name": name,
        "cost": int(cost),
        "icon": icon,
        "description": desc or None,
    })
    if res:
        print(f"  [OK] 商品已创建: {res['id']}")

# ── 批量导入 ──────────────────────────────────────────────

def batch_import(filepath: str):
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"从 {filepath} 导入数据...")

    for goal in data.get("goals", []):
        r = post("/api/goals", goal)
        print(f"  目标 '{goal['name']}': {'OK' if r else '失败'}")

    for project in data.get("projects", []):
        r = post("/api/projects", project)
        print(f"  项目 '{project['name']}': {'OK' if r else '失败'}")

    for task in data.get("tasks", []):
        r = post("/api/tasks", task)
        print(f"  任务 '{task['name']}': {'OK' if r else '失败'}")

    for ref in data.get("reflections", []):
        r = post("/api/reflections", ref)
        print(f"  复盘: {'OK' if r else '失败'}")

    for item in data.get("shopItems", []):
        r = post("/api/shop/items", item)
        print(f"  商品 '{item['name']}': {'OK' if r else '失败'}")

    print("导入完成。")

# ── 交互菜单 ──────────────────────────────────────────────

MENU = """
═══════════════════════════════
   QuestGuild 数据注入
═══════════════════════════════
  1) 插入目标
  2) 插入项目
  3) 插入任务
  4) 插入复盘
  5) 插入商店商品
  ─
  l) 查看已有目标
  p) 查看已有项目
  t) 查看已有任务
  s) 查看已有能力
  ─
  h) 健康检查
  q) 退出
─────────────────────────────────"""

def main():
    print(MENU)
    while True:
        cmd = input("\n> ").strip().lower()
        if cmd == "1": insert_goal()
        elif cmd == "2": insert_project()
        elif cmd == "3": insert_task()
        elif cmd == "4": insert_reflection()
        elif cmd == "5": insert_shop_item()
        elif cmd == "l": list_goals()
        elif cmd == "p": list_projects()
        elif cmd == "t": list_tasks()
        elif cmd == "s": list_skills()
        elif cmd == "h": check_health()
        elif cmd == "q": print("退出。"); break
        else: print("未知指令，请重新输入。")

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--batch":
        batch_import(sys.argv[2])
    else:
        main()

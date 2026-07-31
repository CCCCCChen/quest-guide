import { useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useSkills } from '@/hooks/useSkills';
import { useShop } from '@/hooks/useShop';


// 辅助：获取过去 N 天的日期数组（YYYY-MM-DD）
function getPastDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// 辅助：格式化分钟为 "Xh Ym"
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分`;
}

export function useStats() {
  const { tasks, focusLogs } = useTasks();
  const { skills, skillPoints } = useSkills();
  const { totalEarnedReputation } = useShop();

  // 已完成任务
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed'),
    [tasks]
  );

  // 本周专注总时长（分钟）
  const weeklyFocusMinutes = useMemo(() => {
    const past7 = getPastDays(7);
    return focusLogs
      .filter((log) => past7.includes(log.date))
      .reduce((sum, log) => sum + log.durationMinutes, 0);
  }, [focusLogs]);

  // 总完成任务数
  const totalCompleted = completedTasks.length;

  // 连续完成天数
  const streakDays = useMemo(() => {
    const completedDates = new Set(
      completedTasks.map((t) =>
        new Date(t.completedAt ?? t.createdAt).toISOString().slice(0, 10)
      )
    );
    // 也考虑 focus log 的日期
    focusLogs.forEach((log) => completedDates.add(log.date));

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (completedDates.has(dateStr)) {
        streak++;
      } else if (i === 0) {
        // 今天还没完成，从昨天开始算
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [completedTasks, focusLogs]);

  // 近 7 天每日完成任务数
  const dailyCompletedCounts = useMemo(() => {
    const past7 = getPastDays(7);
    const counts = past7.map((date) => ({
      date,
      count: completedTasks.filter((t) => {
        const d = new Date(t.completedAt ?? t.createdAt)
          .toISOString()
          .slice(0, 10);
        return d === date;
      }).length,
    }));
    return counts;
  }, [completedTasks]);

  // 近 7 天每日专注时长（分钟）
  const dailyFocusMinutes = useMemo(() => {
    const past7 = getPastDays(7);
    const counts = past7.map((date) => ({
      date,
      minutes: focusLogs
        .filter((log) => log.date === date)
        .reduce((sum, log) => sum + log.durationMinutes, 0),
    }));
    return counts;
  }, [focusLogs]);

  // 难度分布
  const difficultyDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      easy: 0,
      normal: 0,
      hard: 0,
      epic: 0,
    };
    completedTasks.forEach((t) => {
      dist[t.difficulty] = (dist[t.difficulty] ?? 0) + 1;
    });
    return dist;
  }, [completedTasks]);

  // 技能成长轨迹（已解锁技能按时间排序）
  const skillGrowthTimeline = useMemo(() => {
    return skills
      .filter((s) => s.status !== 'locked' && s.unlockedAt)
      .sort((a, b) => (a.unlockedAt ?? 0) - (b.unlockedAt ?? 0))
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        status: s.status,
        unlockedAt: s.unlockedAt!,
      }));
  }, [skills]);

  // 已点亮技能数
  const unlockedSkillsCount = useMemo(
    () => skills.filter((s) => s.status !== 'locked').length,
    [skills]
  );

  // 史诗任务完成数
  const epicCompletedCount = useMemo(
    () => completedTasks.filter((t) => t.type === 'epic').length,
    [completedTasks]
  );

  // 每日悬赏完成数
  const dailyCompletedCount = useMemo(
    () => completedTasks.filter((t) => t.type === 'daily').length,
    [completedTasks]
  );

  return {
    // 核心指标
    weeklyFocusMinutes,
    weeklyFocusFormatted: formatMinutes(weeklyFocusMinutes),
    totalCompleted,
    streakDays,
    totalEarnedReputation,
    unlockedSkillsCount,
    skillPoints,
    epicCompletedCount,
    dailyCompletedCount,

    // 图表数据
    dailyCompletedCounts,
    dailyFocusMinutes,
    difficultyDistribution,
    skillGrowthTimeline,

    // 原始数据
    completedTasks,
    focusLogs,
  };
}

export { formatMinutes, getPastDays };

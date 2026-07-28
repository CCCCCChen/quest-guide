import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TreePine,
  Brain,
  Sparkles,
  Lock,
  Zap,
  Star,
  X,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Target,
  Swords,
  Code2,
  Briefcase,
  Lightbulb,
  Megaphone,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useSkills } from '@/hooks/useSkills';
import { useTasks } from '@/hooks/useTasks';
import type { ISkillNode } from '@/types/quest';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, typeof Code2> = {
  元能力: Brain,
  创造能力: Code2,
  系统能力: GitBranch,
  影响能力: Megaphone,
  创新能力: Lightbulb,
};

const CATEGORY_COLORS: Record<string, string> = {
  元能力: '#7C9DFF',
  创造能力: '#9B59E6',
  系统能力: '#3BA3E0',
  影响能力: '#E8B34A',
  创新能力: '#F29940',
};

const PROFICIENCY_THRESHOLDS = [0, 60, 180, 420, 900, 1800];

export default function SkillTreePage() {
  const { skills, skillPoints, unlockSkill, enhanceSkill } = useSkills();
  const { tasks } = useTasks();
  const [selectedNode, setSelectedNode] = useState<ISkillNode | null>(null);
  const [viewBox, setViewBox] = useState({ x: -500, y: -400, w: 1000, h: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const rootNodes = useMemo(
    () => skills.filter((s) => s.level === 0),
    [skills]
  );

  const getChildren = useCallback(
    (parentId: string) => skills.filter((s) => s.parentId === parentId),
    [skills]
  );

  // 计算节点位置：放射状布局已在 preset 中预计算，这里直接用
  const nodesByCategory = useMemo(() => {
    const map: Record<string, ISkillNode[]> = {};
    skills.forEach((s) => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, [skills]);

  // 计算所有连线（父→子）
  const connections = useMemo(() => {
    const lines: { from: ISkillNode; to: ISkillNode }[] = [];
    skills.forEach((node) => {
      if (node.parentId) {
        const parent = skills.find((s) => s.id === node.parentId);
        if (parent) {
          lines.push({ from: parent, to: node });
        }
      }
    });
    return lines;
  }, [skills]);

  // 拖拽平移
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.current.x) * (viewBox.w / (svgRef.current?.clientWidth || 1));
    const dy = (e.clientY - dragStart.current.y) * (viewBox.h / (svgRef.current?.clientHeight || 1));
    setViewBox((prev) => ({
      ...prev,
      x: dragStart.current.vx - dx,
      y: dragStart.current.vy - dy,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.15 : 0.87;
    const newW = viewBox.w * scale;
    const newH = viewBox.h * scale;
    const clampedW = Math.max(400, Math.min(3000, newW));
    const clampedH = Math.max(320, Math.min(2400, newH));
    const ratioW = clampedW / viewBox.w;
    const ratioH = clampedH / viewBox.h;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const svgMx = viewBox.x + (mx / rect.width) * viewBox.w;
    const svgMy = viewBox.y + (my / rect.height) * viewBox.h;
    setViewBox({
      x: svgMx - (svgMx - viewBox.x) * ratioW,
      y: svgMy - (svgMy - viewBox.y) * ratioH,
      w: clampedW,
      h: clampedH,
    });
  };

  const zoomIn = () => {
    const scale = 0.8;
    setViewBox((prev) => ({
      x: prev.x + prev.w * 0.1,
      y: prev.y + prev.h * 0.1,
      w: prev.w * scale,
      h: prev.h * scale,
    }));
  };

  const zoomOut = () => {
    const scale = 1.25;
    setViewBox((prev) => ({
      x: prev.x - prev.w * 0.1,
      y: prev.y - prev.h * 0.1,
      w: prev.w * scale,
      h: prev.h * scale,
    }));
  };

  const resetView = () => {
    setViewBox({ x: -500, y: -400, w: 1000, h: 800 });
  };

  const getNodeColor = (node: ISkillNode) => {
    if (node.status === 'enhanced') return '#E8B34A';
    if (node.status === 'unlocked') return CATEGORY_COLORS[node.category] || '#4CAF7A';
    return '#3a3f4a';
  };

  const getNodeGlow = (node: ISkillNode) => {
    if (node.status === 'enhanced') return 'drop-shadow(0 0 12px rgba(232, 179, 74, 0.8))';
    if (node.status === 'unlocked') return `drop-shadow(0 0 8px ${CATEGORY_COLORS[node.category]}80)`;
    return 'none';
  };

  const relatedTasks = useMemo(() => {
    if (!selectedNode) return [];
    return tasks.filter(
      (t) => t.relatedSkillId === selectedNode.id && t.type === 'epic'
    );
  }, [selectedNode, tasks]);

  const canUnlock = useMemo(() => {
    if (!selectedNode) return false;
    if (selectedNode.status !== 'locked') return false;
    // 父节点必须已解锁
    if (selectedNode.parentId) {
      const parent = skills.find((s) => s.id === selectedNode.parentId);
      if (!parent || parent.status === 'locked') return false;
    }
    return skillPoints >= selectedNode.requiredSkillPoints;
  }, [selectedNode, skills, skillPoints]);

  const handleUnlock = () => {
    if (!selectedNode || !canUnlock) return;
    unlockSkill(selectedNode.id);
    setSelectedNode({ ...selectedNode, status: 'unlocked' });
  };

  const handleEnhance = () => {
    if (!selectedNode || selectedNode.status !== 'unlocked') return;
    enhanceSkill(selectedNode.id);
    setSelectedNode({ ...selectedNode, status: 'enhanced' });
  };

  const totalSkills = skills.length;
  const unlockedCount = skills.filter((s) => s.status !== 'locked').length;
  const enhancedCount = skills.filter((s) => s.status === 'enhanced').length;

  const selectedProgress = useMemo(() => {
    if (!selectedNode) return null;
    const exp = selectedNode.experience ?? 0;
    const lvl = Math.max(0, Math.min(5, selectedNode.proficiencyLevel ?? 0));
    const currentBase = PROFICIENCY_THRESHOLDS[lvl] ?? 0;
    const nextBase = PROFICIENCY_THRESHOLDS[Math.min(5, lvl + 1)] ?? currentBase;
    const span = Math.max(1, nextBase - currentBase);
    const inLevel = Math.max(0, exp - currentBase);
    const pct = lvl >= 5 ? 100 : Math.max(0, Math.min(100, Math.round((inLevel / span) * 100)));
    const last = selectedNode.lastImprovedAt ? new Date(selectedNode.lastImprovedAt).toLocaleString() : null;
    return { exp, lvl, pct, nextBase, last };
  }, [selectedNode]);

  return (
    <div className="space-y-6">
      {/* 顶部标题 + 统计 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
            <TreePine className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">
              个人成长能力树
            </h1>
            <p className="text-sm text-muted-foreground">
              围绕元能力、创造、系统、影响与创新，持续点亮你的成长路径
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 px-4 py-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">能力点</span>
            <span className="text-lg font-bold text-accent tabular-nums">
              {skillPoints}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 px-4 py-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">已点亮</span>
            <span className="text-lg font-bold text-primary tabular-nums">
              {unlockedCount}/{totalSkills}
            </span>
          </div>
        </div>
      </div>

      {/* 能力树主画布 */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/30">
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232_179_74_0.05),transparent_60%)]" />

        {/* 缩放控制 */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={zoomIn}
            className="h-9 w-9 border border-border/50 bg-card/80 backdrop-blur"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={zoomOut}
            className="h-9 w-9 border border-border/50 bg-card/80 backdrop-blur"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={resetView}
            className="h-9 w-9 border border-border/50 bg-card/80 backdrop-blur"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* 图例 */}
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg border border-border/50 bg-card/80 p-3 backdrop-blur">
          <div className="text-xs font-semibold text-foreground">图例</div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
            <span className="text-xs text-muted-foreground">已强化</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent)]" />
            <span className="text-xs text-muted-foreground">已点亮</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">未解锁</span>
          </div>
        </div>

        {/* SVG 画布 */}
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="h-[600px] w-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* 魔法符文装饰背景 */}
          <defs>
            <radialGradient id="nodeGlowGold" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E8B34A" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#E8B34A" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 背景符文圈 */}
          <g opacity="0.15">
            <circle cx="0" cy="0" r="300" fill="none" stroke="#E8B34A" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="0" cy="0" r="200" fill="none" stroke="#9B59E6" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="0" cy="0" r="100" fill="none" stroke="#E8B34A" strokeWidth="1" />
          </g>

          {/* 连线 */}
          <g>
            {connections.map(({ from, to }, i) => {
              const isActive =
                from.status !== 'locked' && to.status !== 'locked';
              const isPartial =
                from.status !== 'locked' && to.status === 'locked';
              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={
                    isActive
                      ? CATEGORY_COLORS[to.category] || '#E8B34A'
                      : isPartial
                      ? '#4a4f5a'
                      : '#2a2f3a'
                  }
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={isActive ? 'none' : '4 4'}
                  opacity={isActive ? 0.8 : 0.4}
                />
              );
            })}
          </g>

          {/* 节点 */}
          <g>
            {skills.map((node) => {
              const CategoryIcon =
                CATEGORY_ICONS[node.category] || Sparkles;
              const isSelected = selectedNode?.id === node.id;
              const nodeColor = getNodeColor(node);
              const nodeSize = node.level === 0 ? 36 : node.level === 1 ? 28 : 22;

              return (
                <g
                  key={node.id}
                  data-node
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedNode(node)}
                  style={{ filter: getNodeGlow(node) }}
                >
                  {/* 外发光圈（已解锁/强化） */}
                  {node.status !== 'locked' && (
                    <motion.circle
                      r={nodeSize + 8}
                      fill={nodeColor}
                      opacity={0.15}
                      animate={{ r: [nodeSize + 6, nodeSize + 12, nodeSize + 6] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  {/* 节点外圈 */}
                  <circle
                    r={nodeSize + 2}
                    fill="none"
                    stroke={isSelected ? '#E8B34A' : nodeColor}
                    strokeWidth={isSelected ? 3 : node.status === 'locked' ? 1 : 2}
                    opacity={node.status === 'locked' ? 0.5 : 1}
                  />

                  {/* 节点主体 */}
                  <circle
                    r={nodeSize}
                    fill={node.status === 'locked' ? '#1e2230' : `${nodeColor}20`}
                    stroke={nodeColor}
                    strokeWidth={1.5}
                  />

                  {/* 图标 */}
                  {node.status !== 'locked' ? (
                    <foreignObject
                      x={-nodeSize * 0.5}
                      y={-nodeSize * 0.5}
                      width={nodeSize}
                      height={nodeSize}
                    >
                      <div className="flex h-full w-full items-center justify-center">
                        <CategoryIcon
                          style={{
                            width: nodeSize * 0.6,
                            height: nodeSize * 0.6,
                            color: nodeColor,
                          }}
                          strokeWidth={1.8}
                        />
                      </div>
                    </foreignObject>
                  ) : (
                    <foreignObject
                      x={-nodeSize * 0.4}
                      y={-nodeSize * 0.4}
                      width={nodeSize * 0.8}
                      height={nodeSize * 0.8}
                    >
                      <div className="flex h-full w-full items-center justify-center">
                        <Lock
                          style={{
                            width: nodeSize * 0.5,
                            height: nodeSize * 0.5,
                            color: '#4a4f5a',
                          }}
                          strokeWidth={1.5}
                        />
                      </div>
                    </foreignObject>
                  )}

                  {/* 节点名称（仅 level 0 和 1 显示） */}
                  {node.level <= 1 && (
                    <text
                      y={nodeSize + 16}
                      textAnchor="middle"
                      fill={
                        node.status === 'locked'
                          ? '#5a5f6a'
                          : node.status === 'enhanced'
                          ? '#E8B34A'
                          : '#d4c9a8'
                      }
                      fontSize={node.level === 0 ? 13 : 11}
                      fontWeight={node.level === 0 ? 700 : 500}
                    >
                      {node.name}
                    </text>
                  )}

                  {/* 强化标记 */}
                  {node.status === 'enhanced' && (
                    <g transform={`translate(${nodeSize - 4}, ${-nodeSize + 4})`}>
                      <circle r="8" fill="#E8B34A" />
                      <text
                        textAnchor="middle"
                        y="3"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#1a1d28"
                      >
                        ★
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 节点详情侧栏 */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-6 top-24 z-50 w-80"
          >
            <Card className="border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${
                        CATEGORY_COLORS[selectedNode.category] || '#E8B34A'
                      }20`,
                      border: `1px solid ${
                        CATEGORY_COLORS[selectedNode.category] || '#E8B34A'
                      }60`,
                    }}
                  >
                    {selectedNode.status === 'locked' ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      (() => {
                        const Icon =
                          CATEGORY_ICONS[selectedNode.category] || Sparkles;
                        return (
                          <Icon
                            className="h-5 w-5"
                            style={{
                              color:
                                CATEGORY_COLORS[selectedNode.category] ||
                                '#E8B34A',
                            }}
                          />
                        );
                      })()
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">
                      {selectedNode.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 border-border/60 text-muted-foreground"
                      >
                        {selectedNode.category}
                      </Badge>
                      <Badge
                        className={cn(
                          'text-[10px] h-4',
                          selectedNode.status === 'enhanced'
                            ? 'bg-primary text-primary-foreground'
                            : selectedNode.status === 'unlocked'
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {selectedNode.status === 'enhanced'
                          ? '已强化'
                          : selectedNode.status === 'unlocked'
                          ? '已点亮'
                          : '未解锁'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 -mt-1 -mr-1"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedNode.description}
                </p>

                <Separator className="bg-border/40" />

                {selectedProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">当前等级</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        Lv.{selectedProgress.lvl}
                      </span>
                    </div>
                    <Progress value={selectedProgress.pct} className="h-2 bg-secondary/60" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>经验 {selectedProgress.exp} min</span>
                      {selectedProgress.lvl >= 5 ? (
                        <span>已达最高等级</span>
                      ) : (
                        <span>下一等级 {selectedProgress.nextBase} min</span>
                      )}
                    </div>
                    {selectedProgress.last && (
                      <div className="text-[11px] text-muted-foreground">
                        最近提升：{selectedProgress.last}
                      </div>
                    )}
                  </div>
                )}

                {/* 解锁信息 */}
                {selectedNode.status === 'locked' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        解锁所需能力点
                      </span>
                      <span className="text-sm font-semibold text-accent tabular-nums">
                        {selectedNode.requiredSkillPoints}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        可用能力点
                      </span>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          skillPoints >= selectedNode.requiredSkillPoints
                            ? 'text-success'
                            : 'text-destructive'
                        )}
                      >
                        {skillPoints}
                      </span>
                    </div>
                    <Button
                      className="w-full mt-2"
                      disabled={!canUnlock}
                      onClick={handleUnlock}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      点亮能力
                    </Button>
                    {!canUnlock && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        {selectedNode.parentId
                          ? '需先点亮前置能力'
                          : '能力点不足，完成史诗任务获取'}
                      </p>
                    )}
                  </div>
                )}

                {selectedNode.status === 'unlocked' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-md bg-success/10 p-2 border border-success/20">
                      <Sparkles className="h-4 w-4 text-success shrink-0" />
                      <span className="text-xs text-foreground">
                        能力已点亮，继续成长可强化
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleEnhance}
                    >
                      <Star className="h-4 w-4 mr-2 text-primary" />
                      强化能力
                    </Button>
                  </div>
                )}

                {selectedNode.status === 'enhanced' && (
                  <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 border border-primary/20">
                    <Star className="h-5 w-5 text-primary shrink-0 fill-primary/30" />
                    <div>
                      <div className="text-sm font-semibold text-primary">
                        已达强化等级
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        你在该领域已登峰造极
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="bg-border/40" />

                {/* 关联任务 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      关联史诗任务
                    </span>
                  </div>
                  {relatedTasks.length > 0 ? (
                    <div className="space-y-2">
                      {relatedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-md border border-border/40 bg-secondary/30 p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-xs font-medium text-foreground truncate">
                              {task.name}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${task.bossProgress}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>进度 {task.bossProgress}%</span>
                            <span>
                              {task.status === 'completed'
                                ? '已完成'
                                : '进行中'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      暂无关联的史诗任务
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">总能力节点</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {totalSkills}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">已点亮</div>
            <div className="text-2xl font-bold text-accent tabular-nums">
              {unlockedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">已强化</div>
            <div className="text-2xl font-bold text-primary tabular-nums">
              {enhancedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">能力分类</div>
            <div className="text-2xl font-bold text-success tabular-nums">
              {Object.keys(nodesByCategory).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">可用能力点</div>
            <div className="text-2xl font-bold text-warning tabular-nums">
              {skillPoints}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

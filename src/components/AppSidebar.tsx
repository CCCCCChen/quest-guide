import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Scroll, Swords, TreePine, Store, BarChart3, Settings, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: '今日任务', icon: Scroll },
  { path: '/quest-pool', label: '悬赏池', icon: Swords },
  { path: '/skill-tree', label: '能力树', icon: TreePine },
  { path: '/shop', label: '公会商店', icon: Store },
  { path: '/stats', label: '统计面板', icon: BarChart3 },
  { path: '/settings', label: '设置', icon: Settings },
];

function AppSidebarInner() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-4 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-9 shrink-0 rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-base font-bold truncate text-foreground tracking-wide">
              悬赏任务公会
            </div>
            <div className="text-xs text-muted-foreground truncate">
              Quest Guild · 冒险者大厅
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? pathname === '/'
                  : pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className="flex items-center gap-3"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-3 group-data-[state=collapsed]:hidden">
          <div className="text-xs text-muted-foreground">
            愿勇气与你同在
          </div>
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
            v2.0 · 冒险者大厅
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

const AppSidebar = memo(AppSidebarInner);
export default AppSidebar;

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Cog,
  ScrollText,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/projects", label: "项目管理", icon: FolderKanban },
  { to: "/releases", label: "发版计划", icon: GitBranch },
  { to: "/builds", label: "构建任务", icon: Cog },
  { to: "/audit-logs", label: "审计日志", icon: ScrollText },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-semibold tracking-tight">
          Nowen Release Hub
        </h1>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

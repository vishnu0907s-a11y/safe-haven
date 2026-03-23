import { useState } from "react";
import { Users, AlertTriangle, CheckCircle2, Clock, Search, MoreVertical, Ban, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const mockUsers = [
  { id: "1", name: "Priya Sharma", role: "women", city: "Mumbai", status: "verified" },
  { id: "2", name: "Rahul Verma", role: "driver", city: "Delhi", status: "pending" },
  { id: "3", name: "Inspector Singh", role: "police", city: "Pune", status: "verified" },
  { id: "4", name: "Anita Desai", role: "protector", city: "Chennai", status: "rejected" },
  { id: "5", name: "Kavita Nair", role: "women", city: "Bangalore", status: "pending" },
  { id: "6", name: "Suresh Kumar", role: "driver", city: "Hyderabad", status: "verified" },
];

const stats = [
  { label: "Total Users", value: "1,247", icon: Users, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { label: "Active Alerts", value: "3", icon: AlertTriangle, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { label: "Verified", value: "892", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { label: "Avg Response", value: "4.2m", icon: Clock, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = mockUsers.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.role === filter || u.status === filter;
    return matchSearch && matchFilter;
  });

  if (!user) return null;

  return (
    <div className="px-4 space-y-4">
      {/* Admin profile */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {user.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        {stats.map((stat) => (
          <div key={stat.label} className="p-3.5 rounded-xl bg-card border">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Users section */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">All Users</h2>
          <Button variant="ghost" size="sm" className="text-xs text-primary">See All</Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          {["all", "women", "driver", "police", "protector", "verified", "pending"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{u.role} • {u.city}</p>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                u.status === "verified" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                u.status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                u.status === "rejected" && "bg-red-500/10 text-red-600 dark:text-red-400",
              )}>
                {u.status}
              </span>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors active:scale-95">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors active:scale-95">
                  <Ban className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Users, AlertTriangle, CheckCircle2, Clock, Search, Eye, Trash2, Shield, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  verification_status: string;
  aadhaar_url: string | null;
  driving_license_url: string | null;
  role?: string;
}

interface OnDutyRescuer {
  id: string;
  user_id: string;
  checked_in_at: string;
  latitude: number | null;
  longitude: number | null;
  full_name?: string;
  role?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [onDutyRescuers, setOnDutyRescuers] = useState<OnDutyRescuer[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, verified: 0 });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [viewingProof, setViewingProof] = useState<UserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "onduty">("users");

  useEffect(() => {
    fetchUsers();
    fetchOnDuty();
    fetchStats();

    // Realtime on-duty updates
    const channel = supabase
      .channel("admin-attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        fetchOnDuty();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");
    
    if (profiles) {
      const merged = profiles.map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.user_id)?.role || "unknown",
      }));
      setUsers(merged);
    }
    setLoadingUsers(false);
  };

  const fetchOnDuty = async () => {
    const { data: shifts } = await supabase
      .from("attendance")
      .select("*")
      .eq("status", "active")
      .order("checked_in_at", { ascending: false });

    if (shifts && shifts.length > 0) {
      const userIds = shifts.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      
      const enriched: OnDutyRescuer[] = shifts.map((s) => ({
        ...s,
        full_name: profiles?.find((p) => p.user_id === s.user_id)?.full_name || "Unknown",
        role: roles?.find((r) => r.user_id === s.user_id)?.role || "responder",
      }));
      setOnDutyRescuers(enriched);
    } else {
      setOnDutyRescuers([]);
    }
  };

  const fetchStats = async () => {
    const { count: total } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: activeAlerts } = await supabase.from("emergency_alerts").select("*", { count: "exact", head: true }).eq("status", "active");
    const { count: verified } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "verified");
    setStats({ total: total || 0, active: activeAlerts || 0, verified: verified || 0 });
  };

  const handleDeleteUser = async (userId: string) => {
    // Delete profile (cascade will clean up related data)
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      toast.error("Failed to delete user — they may have protected records");
    } else {
      toast.success("User removed");
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      setDeleteConfirm(null);
    }
  };

  const getProofUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const filtered = users.filter((u) => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.role === filter || u.verification_status === filter;
    return matchSearch && matchFilter;
  });

  const statCards = [
    { label: "Total Users", value: stats.total, icon: Users, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Active Alerts", value: stats.active, icon: AlertTriangle, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
    { label: "Verified", value: stats.verified, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "On Duty", value: onDutyRescuers.length, icon: Shield, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ];

  if (!user) return null;

  return (
    <div className="px-4 space-y-4">
      {/* Admin profile */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {user.full_name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-3.5 rounded-xl bg-card border">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
        <button
          onClick={() => setTab("users")}
          className={cn(
            "flex-1 py-2 rounded-xl text-sm font-bold transition-colors",
            tab === "users" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          All Users
        </button>
        <button
          onClick={() => setTab("onduty")}
          className={cn(
            "flex-1 py-2 rounded-xl text-sm font-bold transition-colors",
            tab === "onduty" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          On-Duty ({onDutyRescuers.length})
        </button>
      </div>

      {tab === "users" && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

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

          {loadingUsers ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:shadow-sm transition-shadow">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{u.role} • {u.city || "N/A"}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    u.verification_status === "verified" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    u.verification_status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    u.verification_status === "rejected" && "bg-red-500/10 text-red-600 dark:text-red-400",
                  )}>
                    {u.verification_status}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setViewingProof(u)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors active:scale-95"
                      title="View details & proof"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(u.user_id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors active:scale-95"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "onduty" && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
          {onDutyRescuers.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No rescuers currently on duty</p>
            </div>
          ) : (
            onDutyRescuers.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.full_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{r.role}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-400">Active</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    Since {new Date(r.checked_in_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* View proof modal */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewingProof(null)}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black">User Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {viewingProof.full_name}</p>
              <p><span className="text-muted-foreground">Phone:</span> {viewingProof.phone || "N/A"}</p>
              <p><span className="text-muted-foreground">City:</span> {viewingProof.city || "N/A"}</p>
              <p><span className="text-muted-foreground">Role:</span> <span className="capitalize">{viewingProof.role}</span></p>
              <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{viewingProof.verification_status}</span></p>
            </div>
            {(viewingProof.aadhaar_url || viewingProof.driving_license_url) && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Uploaded Proofs</p>
                {viewingProof.aadhaar_url && (
                  <a href={getProofUrl(viewingProof.aadhaar_url) || "#"} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-secondary/50 border border-border/40 text-sm text-primary hover:underline">
                    📄 Aadhaar Proof
                  </a>
                )}
                {viewingProof.driving_license_url && (
                  <a href={getProofUrl(viewingProof.driving_license_url) || "#"} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-secondary/50 border border-border/40 text-sm text-primary hover:underline">
                    📄 Driving License
                  </a>
                )}
              </div>
            )}
            <button onClick={() => setViewingProof(null)} className="w-full py-2.5 rounded-xl bg-secondary text-sm font-bold">Close</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-xs space-y-4 animate-in zoom-in-95 duration-200 text-center" onClick={(e) => e.stopPropagation()}>
            <Trash2 className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm font-bold">Delete this user?</p>
            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-bold">Cancel</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

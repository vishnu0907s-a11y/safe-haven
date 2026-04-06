import { useState, useEffect } from "react";
import { Users, AlertTriangle, CheckCircle2, Clock, Search, Eye, Trash2, Shield, MapPin, Check, X, Video, Download, Play, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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

interface EvidenceItem {
  name: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  url: string;
}

interface AlertWithUser {
  id: string;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
  accepted_by: string[] | null;
  user_id: string;
  user_name?: string;
  avatar_url?: string | null;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [onDutyRescuers, setOnDutyRescuers] = useState<OnDutyRescuer[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, verified: 0 });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [viewingProof, setViewingProof] = useState<UserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "onduty" | "evidence" | "alerts">("users");

  // Evidence state
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<string>("all");
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [evidenceDateFrom, setEvidenceDateFrom] = useState("");
  const [evidenceDateTo, setEvidenceDateTo] = useState("");

  // Alerts state
  const [adminAlerts, setAdminAlerts] = useState<AlertWithUser[]>([]);
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "resolved">("all");

  useEffect(() => {
    fetchUsers();
    fetchOnDuty();
    fetchStats();
    fetchEvidence();
    fetchAlerts();

    const channel = supabase
      .channel("admin-attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        fetchOnDuty();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_alerts" }, () => {
        fetchAlerts();
        fetchStats();
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

  const fetchEvidence = async () => {
    setLoadingEvidence(true);
    try {
      const { data: files, error } = await supabase.storage.from("videos").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      
      if (error || !files) {
        setEvidence([]);
        setLoadingEvidence(false);
        return;
      }

      // List files inside each user folder
      const allEvidence: EvidenceItem[] = [];
      const folderNames = files.filter(f => !f.name.includes('.')).map(f => f.name);
      
      for (const folder of folderNames) {
        const { data: userFiles } = await supabase.storage.from("videos").list(folder, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
        if (userFiles) {
          for (const file of userFiles) {
            if (file.name.includes('.')) {
              const { data: urlData } = supabase.storage.from("videos").getPublicUrl(`${folder}/${file.name}`);
              allEvidence.push({
                name: file.name,
                created_at: file.created_at || new Date().toISOString(),
                user_id: folder,
                url: urlData?.publicUrl || "",
              });
            }
          }
        }
      }

      // Enrich with user names
      const uniqueUserIds = [...new Set(allEvidence.map(e => e.user_id))];
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", uniqueUserIds);
        
        allEvidence.forEach(e => {
          e.user_name = profiles?.find(p => p.user_id === e.user_id)?.full_name || "Unknown User";
        });
      }

      setEvidence(allEvidence);
    } catch {
      setEvidence([]);
    }
    setLoadingEvidence(false);
  };

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const enriched: AlertWithUser[] = data.map(a => ({
        ...a,
        user_name: profiles?.find(p => p.user_id === a.user_id)?.full_name || "Unknown",
        avatar_url: profiles?.find(p => p.user_id === a.user_id)?.avatar_url || null,
      }));
      setAdminAlerts(enriched);
    } else {
      setAdminAlerts(data?.map(a => ({ ...a, user_name: "Unknown", avatar_url: null })) || []);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      toast.error(t("deleteFailed"));
    } else {
      toast.success(t("userRemoved"));
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      setDeleteConfirm(null);
    }
  };

  const handleApproveUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ verification_status: "verified" as any }).eq("user_id", userId);
    if (error) {
      toast.error(t("approvalFailed"));
    } else {
      toast.success(t("userApproved"));
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, verification_status: "verified" } : u));
      fetchStats();
    }
  };

  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ verification_status: "rejected" as any }).eq("user_id", userId);
    if (error) {
      toast.error(t("approvalFailed"));
    } else {
      toast.success(t("userRejected"));
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, verification_status: "rejected" } : u));
      fetchStats();
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

  const filteredAlerts = adminAlerts.filter(a => {
    if (alertFilter === "active") return a.status === "active";
    if (alertFilter === "resolved") return a.status === "resolved";
    return true;
  });

  const statCards = [
    { label: t("totalUsers"), value: stats.total, icon: Users, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: t("activeAlerts"), value: stats.active, icon: AlertTriangle, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
    { label: t("verified"), value: stats.verified, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: t("onDuty"), value: onDutyRescuers.length, icon: Shield, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
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
          <p className="text-xs text-muted-foreground">{t("administrator")}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-3.5 rounded-xl bg-card border hover:shadow-md transition-shadow">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher — 4 tabs */}
      <div className="grid grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
        {(["users", "onduty", "alerts", "evidence"] as const).map((t_tab) => (
          <button
            key={t_tab}
            onClick={() => setTab(t_tab)}
            className={cn(
              "py-2 rounded-xl text-[11px] font-bold transition-colors",
              tab === t_tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {t_tab === "users" ? t("allUsers") : t_tab === "onduty" ? t("onDutyRescuers") : t_tab === "alerts" ? t("alerts") : t("evidence")}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("searchUsers")}
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
            <div className="p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
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
                    {u.verification_status === "pending" && (
                      <>
                        <button onClick={() => handleApproveUser(u.user_id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors active:scale-95" title={t("approve")}>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                        <button onClick={() => handleRejectUser(u.user_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors active:scale-95" title={t("reject")}>
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                    <button onClick={() => setViewingProof(u)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors active:scale-95" title={t("userDetails")}>
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteConfirm(u.user_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors active:scale-95" title={t("delete")}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ON-DUTY TAB */}
      {tab === "onduty" && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
          {onDutyRescuers.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">{t("noRescuersOnDuty")}</p>
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
                    <span className="text-[10px] font-bold text-emerald-400">{t("active")}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {t("since")} {new Date(r.checked_in_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ALERTS TAB — with user names */}
      {tab === "alerts" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
          <div className="flex gap-2 mb-2">
            {(["all", "active", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setAlertFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
                  alertFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {f === "all" ? t("all") : f === "active" ? t("active") : t("resolved")}
              </button>
            ))}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">{t("noPastAlerts")}</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  alert.status === "active"
                    ? "bg-destructive/5 border-destructive/30 shadow-[0_0_15px_hsl(0_72%_51%/0.15)]"
                    : "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_hsl(145_63%_42%/0.1)]"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    alert.status === "active"
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  )}>
                    {alert.user_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{alert.user_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full",
                      alert.status === "active"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-emerald-500/15 text-emerald-500"
                    )}>
                      {alert.status === "active" ? "🔴 " + t("active") : "🟢 " + t("resolved")}
                    </span>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{(alert.accepted_by || []).length} {t("responders")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EVIDENCE TAB */}
      {tab === "evidence" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
          {loadingEvidence ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
          ) : evidence.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">{t("noEvidence")}</p>
            </div>
          ) : (
            evidence.map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                    <Video className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.user_name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <video
                  src={item.url}
                  controls
                  className="w-full rounded-xl bg-black/50 max-h-48"
                  preload="metadata"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* View proof modal */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewingProof(null)}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black">{t("userDetails")}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">{t("name")}:</span> {viewingProof.full_name}</p>
              <p><span className="text-muted-foreground">{t("phone")}:</span> {viewingProof.phone || "N/A"}</p>
              <p><span className="text-muted-foreground">{t("city")}:</span> {viewingProof.city || "N/A"}</p>
              <p><span className="text-muted-foreground">{t("role")}:</span> <span className="capitalize">{viewingProof.role}</span></p>
              <p><span className="text-muted-foreground">{t("status")}:</span> <span className="capitalize">{viewingProof.verification_status}</span></p>
            </div>

            {viewingProof.verification_status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => { handleApproveUser(viewingProof.user_id); setViewingProof({ ...viewingProof, verification_status: "verified" }); }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {t("approve")}
                </button>
                <button
                  onClick={() => { handleRejectUser(viewingProof.user_id); setViewingProof({ ...viewingProof, verification_status: "rejected" }); }}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" /> {t("reject")}
                </button>
              </div>
            )}

            {(viewingProof.aadhaar_url || viewingProof.driving_license_url) && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("uploadedProofs")}</p>
                {viewingProof.aadhaar_url && (
                  <a href={getProofUrl(viewingProof.aadhaar_url) || "#"} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-secondary/50 border border-border/40 text-sm text-primary hover:underline">
                    {t("aadhaarProof")}
                  </a>
                )}
                {viewingProof.driving_license_url && (
                  <a href={getProofUrl(viewingProof.driving_license_url) || "#"} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-secondary/50 border border-border/40 text-sm text-primary hover:underline">
                    {t("drivingLicense")}
                  </a>
                )}
              </div>
            )}
            <button onClick={() => setViewingProof(null)} className="w-full py-2.5 rounded-xl bg-secondary text-sm font-bold">{t("close")}</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-xs space-y-4 animate-in zoom-in-95 duration-200 text-center" onClick={(e) => e.stopPropagation()}>
            <Trash2 className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm font-bold">{t("deleteUser")}</p>
            <p className="text-xs text-muted-foreground">{t("cannotUndo")}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-bold">{t("cancel")}</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold">{t("delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, AlertTriangle, CheckCircle2, Clock, Search, Eye, Trash2, Shield, MapPin, Check, X, Video, Download, Filter } from "lucide-react";
import { AdminMap } from "@/components/AdminMap";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface UserRow {
  id: string; user_id: string; full_name: string; phone: string | null;
  city: string | null; verification_status: string;
  aadhaar_url: string | null; driving_license_url: string | null; role?: string;
}
interface OnDutyRescuer {
  id: string; user_id: string; checked_in_at: string;
  latitude: number | null; longitude: number | null;
  full_name?: string; role?: string;
}
interface EvidenceItem {
  name: string; created_at: string; user_id: string; user_name?: string; url: string;
}
interface AlertWithUser {
  id: string; status: string; created_at: string; latitude: number; longitude: number;
  accepted_by: string[] | null; user_id: string; user_name?: string; avatar_url?: string | null;
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
  const [viewingProof, setViewingProof] = useState<UserRow | null>(false as any);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/";

  const [tab, setTab] = useState<"users" | "alerts" | "evidence" | "map">(() => {
    if (location.pathname.includes("/admin/users")) return "users";
    if (location.pathname.includes("/admin/evidence")) return "evidence";
    if (location.pathname.includes("/admin/map")) return "map";
    return "alerts";
  });

  useEffect(() => {
    if (location.pathname.includes("/admin/users")) setTab("users");
    else if (location.pathname.includes("/admin/evidence")) setTab("evidence");
    else if (location.pathname.includes("/admin/map")) setTab("map");
    else setTab("alerts");
  }, [location.pathname]);

  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [evidenceDateFrom, setEvidenceDateFrom] = useState("");
  const [evidenceDateTo, setEvidenceDateTo] = useState("");

  const [adminAlerts, setAdminAlerts] = useState<AlertWithUser[]>([]);
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "resolved">("all");

  useEffect(() => {
    fetchUsers(); fetchOnDuty(); fetchStats(); fetchEvidence(); fetchAlerts();
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchOnDuty())
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_alerts" }, () => { fetchAlerts(); fetchStats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    if (profiles) setUsers(profiles.map((p) => ({ ...p, role: roles?.find((r) => r.user_id === p.user_id)?.role || "unknown" })));
    setLoadingUsers(false);
  };

  const fetchOnDuty = async () => {
    const { data: shifts } = await supabase.from("attendance").select("*").eq("status", "active").order("checked_in_at", { ascending: false });
    if (shifts && shifts.length > 0) {
      const ids = shifts.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      setOnDutyRescuers(shifts.map((s) => ({ ...s, full_name: profiles?.find((p) => p.user_id === s.user_id)?.full_name || "Unknown", role: roles?.find((r) => r.user_id === s.user_id)?.role || "responder" })));
    } else setOnDutyRescuers([]);
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
      const { data: files } = await supabase.storage.from("videos").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (!files) { setEvidence([]); setLoadingEvidence(false); return; }
      const allEvidence: EvidenceItem[] = [];
      const folders = files.filter(f => !f.name.includes('.')).map(f => f.name);
      for (const folder of folders) {
        const { data: userFiles } = await supabase.storage.from("videos").list(folder, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
        if (userFiles) {
          for (const file of userFiles) {
            if (file.name.includes('.')) {
              const { data: urlData } = supabase.storage.from("videos").getPublicUrl(`${folder}/${file.name}`);
              allEvidence.push({ name: file.name, created_at: file.created_at || new Date().toISOString(), user_id: folder, url: urlData?.publicUrl || "" });
            }
          }
        }
      }
      const uids = [...new Set(allEvidence.map(e => e.user_id))];
      if (uids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", uids);
        allEvidence.forEach(e => { e.user_name = profiles?.find(p => p.user_id === e.user_id)?.full_name || "Unknown"; });
      }
      setEvidence(allEvidence);
    } catch { setEvidence([]); }
    setLoadingEvidence(false);
  };

  const fetchAlerts = async () => {
    const { data } = await supabase.from("emergency_alerts").select("*").order("created_at", { ascending: false }).limit(50);
    if (data && data.length > 0) {
      const uids = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", uids);
      setAdminAlerts(data.map(a => ({ ...a, user_name: profiles?.find(p => p.user_id === a.user_id)?.full_name || "Unknown", avatar_url: profiles?.find(p => p.user_id === a.user_id)?.avatar_url || null })));
    } else setAdminAlerts([]);
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) toast.error(t("deleteFailed"));
    else { toast.success(t("userRemoved")); setUsers((prev) => prev.filter((u) => u.user_id !== userId)); setDeleteConfirm(null); }
  };
  const handleApproveUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ verification_status: "verified" as any }).eq("user_id", userId);
    if (error) toast.error(t("approvalFailed"));
    else { toast.success(t("userApproved")); setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, verification_status: "verified" } : u)); fetchStats(); }
  };
  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ verification_status: "rejected" as any }).eq("user_id", userId);
    if (error) toast.error(t("approvalFailed"));
    else { toast.success(t("userRejected")); setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, verification_status: "rejected" } : u)); fetchStats(); }
  };

  const getProofUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage.from("documents").getPublicUrl(path).data?.publicUrl || null;
  };

  const filtered = users.filter((u) => {
    const ms = u.full_name.toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || u.role === filter || u.verification_status === filter;
    return ms && mf;
  });
  const filteredAlerts = adminAlerts.filter(a => alertFilter === "all" || a.status === alertFilter);

  const statCards = [
    { label: t("totalUsers"), value: stats.total, icon: Users, color: "text-primary" },
    { label: t("activeAlerts"), value: stats.active, icon: AlertTriangle, color: "text-destructive" },
    { label: t("verified"), value: stats.verified, icon: CheckCircle2, color: "text-accent" },
    { label: t("onDuty"), value: onDutyRescuers.length, icon: Shield, color: "text-warning" },
  ];

  if (!user) return null;

  return (
    <div className="px-4 space-y-4 pb-4">
      {isDashboard && (
        <>
          {/* Admin header */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm">{user.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{t("administrator")}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(["alerts", "map", "users", "evidence"] as const).map((t_tab) => (
              <button
                key={t_tab}
                onClick={() => navigate(`/admin/${t_tab}`)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors",
                  tab === t_tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {t_tab === "alerts" ? t("alerts") : t_tab === "map" ? "Map" : t_tab === "users" ? t("allUsers") : t("evidence")}
              </button>
            ))}
          </div>
        </>
      )}

      {/* MAP TAB */}
      {tab === "map" && (
        <div className="space-y-4">
          <AdminMap alerts={adminAlerts} rescuers={onDutyRescuers} />
        </div>
      )}

      {/* ALERTS TAB */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {/* Alert Stats - moved from top */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <p className="text-[10px] text-muted-foreground font-medium uppercase">{t("activeAlerts")}</p>
              </div>
              <p className="text-xl font-bold text-destructive">{stats.active}</p>
            </div>
            <div className="p-3 rounded-xl bg-warning/5 border border-warning/10">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-warning" />
                <p className="text-[10px] text-muted-foreground font-medium uppercase">{t("onDuty")}</p>
              </div>
              <p className="text-xl font-bold text-warning">{onDutyRescuers.length}</p>
            </div>
          </div>

          {/* On-duty rescuers list */}
          <div className="p-4 rounded-xl bg-card border">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold">{t("onDutyRescuers")}</p>
              <span className="ml-auto text-xs font-bold text-accent">{onDutyRescuers.length}</span>
            </div>
            {onDutyRescuers.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noRescuersOnDuty")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {onDutyRescuers.map((r) => (
                  <div key={r.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="font-medium truncate max-w-[120px]">{r.full_name}</span>
                    <span className="text-[9px] text-muted-foreground capitalize">({r.role})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm font-semibold">{t("emergencyAlerts")}</p>
            </div>
            <div className="flex gap-1.5 mb-2">
              {(["all", "active", "resolved"] as const).map((f) => (
                <button key={f} onClick={() => setAlertFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium", alertFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {f === "all" ? t("all") : f === "active" ? t("active") : t("resolved")}
                </button>
              ))}
            </div>
            {filteredAlerts.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border text-center">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">{t("noPastAlerts")}</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className={cn("p-3.5 rounded-xl border", alert.status === "active" ? "bg-destructive/5 border-destructive/20" : "bg-accent/5 border-accent/20")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", alert.status === "active" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent")}>
                      {alert.user_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.user_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", alert.status === "active" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent")}>
                        {alert.status === "active" ? "🔴 Active" : "🟢 Resolved"}
                      </span>
                      <p className="text-[9px] text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{(alert.accepted_by || []).length} {t("responders")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* User Stats - moved from top */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("totalUsers")}</p>
                <p className="text-xl font-bold text-primary">{stats.total}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("verified")}</p>
              <p className="text-sm font-bold text-accent">{stats.verified}</p>
            </div>
          </div>

          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("searchUsers")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
              {["all", "women", "driver", "police", "protector", "verified", "pending"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap", filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {loadingUsers ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">{u.full_name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{u.role} • {u.city || "N/A"}</p>
                    </div>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",
                      u.verification_status === "verified" && "bg-accent/10 text-accent",
                      u.verification_status === "pending" && "bg-warning/10 text-warning",
                      u.verification_status === "rejected" && "bg-destructive/10 text-destructive",
                    )}>{u.verification_status}</span>
                    <div className="flex gap-0.5">
                      {u.verification_status === "pending" && (
                        <>
                          <button onClick={() => handleApproveUser(u.user_id)} className="p-1.5 rounded-lg hover:bg-accent/10 active:scale-95"><Check className="w-3.5 h-3.5 text-accent" /></button>
                          <button onClick={() => handleRejectUser(u.user_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 active:scale-95"><X className="w-3.5 h-3.5 text-destructive" /></button>
                        </>
                      )}
                      <button onClick={() => setViewingProof(u)} className="p-1.5 rounded-lg hover:bg-secondary active:scale-95"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setDeleteConfirm(u.user_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 active:scale-95"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}



      {/* EVIDENCE TAB */}
      {tab === "evidence" && (() => {
        const fe = evidence.filter(item => {
          const ms = !evidenceSearch || (item.user_name || "").toLowerCase().includes(evidenceSearch.toLowerCase());
          const d = new Date(item.created_at);
          const mf = !evidenceDateFrom || d >= new Date(evidenceDateFrom);
          const mt = !evidenceDateTo || d <= new Date(evidenceDateTo + "T23:59:59");
          return ms && mf && mt;
        });
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by user..." value={evidenceSearch} onChange={(e) => setEvidenceSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-medium mb-0.5 block">From</label>
                  <Input type="date" value={evidenceDateFrom} onChange={(e) => setEvidenceDateFrom(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground font-medium mb-0.5 block">To</label>
                  <Input type="date" value={evidenceDateTo} onChange={(e) => setEvidenceDateTo(e.target.value)} className="h-8 text-xs" />
                </div>
                {(evidenceDateFrom || evidenceDateTo || evidenceSearch) && (
                  <button onClick={() => { setEvidenceSearch(""); setEvidenceDateFrom(""); setEvidenceDateTo(""); }} className="self-end px-2 h-8 rounded-lg bg-secondary text-[10px] font-medium text-muted-foreground">Clear</button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{fe.length} result(s)</p>
            </div>
            {loadingEvidence ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
            ) : fe.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border text-center">
                <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">{t("noEvidence")}</p>
              </div>
            ) : (
              fe.map((item, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-card border space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center"><Video className="w-4 h-4 text-destructive" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.user_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-primary/10 text-primary active:scale-95"><Download className="w-4 h-4" /></a>
                  </div>
                  <video src={item.url} controls className="w-full rounded-lg bg-black/50 max-h-48" preload="metadata" />
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* View proof dialog */}
      <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("userDetails")}</DialogTitle>
            <DialogDescription>{viewingProof?.full_name}</DialogDescription>
          </DialogHeader>
          {viewingProof && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">{t("phone")}:</span> {viewingProof.phone || "N/A"}</p>
              <p><span className="text-muted-foreground">{t("city")}:</span> {viewingProof.city || "N/A"}</p>
              <p><span className="text-muted-foreground">{t("role")}:</span> <span className="capitalize">{viewingProof.role}</span></p>
              <p><span className="text-muted-foreground">{t("status")}:</span> <span className="capitalize">{viewingProof.verification_status}</span></p>
              {viewingProof.verification_status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => { handleApproveUser(viewingProof.user_id); setViewingProof({ ...viewingProof, verification_status: "verified" }); }} className="flex-1 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> {t("approve")}</button>
                  <button onClick={() => { handleRejectUser(viewingProof.user_id); setViewingProof({ ...viewingProof, verification_status: "rejected" }); }} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-1.5"><X className="w-4 h-4" /> {t("reject")}</button>
                </div>
              )}
              {(viewingProof.aadhaar_url || viewingProof.driving_license_url) && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("uploadedProofs")}</p>
                  {viewingProof.aadhaar_url && <a href={getProofUrl(viewingProof.aadhaar_url) || "#"} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-lg bg-secondary text-sm text-primary hover:underline">{t("aadhaarProof")}</a>}
                  {viewingProof.driving_license_url && <a href={getProofUrl(viewingProof.driving_license_url) || "#"} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-lg bg-secondary text-sm text-primary hover:underline">{t("drivingLicense")}</a>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("deleteUser")}</DialogTitle>
            <DialogDescription>{t("cannotUndo")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">{t("cancel")}</button>
            <button onClick={() => deleteConfirm && handleDeleteUser(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">{t("delete")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, AlertTriangle, CheckCircle2, Clock, Search, Eye, Trash2, Shield, MapPin, Check, X, Video, Download, Filter, Plus, MessageSquare, Bell, Film } from "lucide-react";
import { AdminMap } from "@/components/AdminMap";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getDistanceKm, getEta } from "@/lib/map-utils";
import { useComplaints, Complaint } from "@/hooks/use-complaints";

const ADMIN_LOCATION = { lat: 13.0827, lng: 80.2707 }; // Fixed admin location

interface UserRow {
  id: string; user_id: string; full_name: string; phone: string | null;
  city: string | null; verification_status: string;
  aadhaar_url: string | null; driving_license_url: string | null; role?: string;
  avatar_url?: string | null;
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
  responders?: { id: string; full_name: string }[];
  resolved_at?: string | null;
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

  const [tab, setTab] = useState<"dashboard" | "users" | "alerts" | "evidence" | "map">(() => {
    if (location.pathname.includes("/admin/users")) return "users";
    if (location.pathname.includes("/admin/alerts")) return "alerts";
    if (location.pathname.includes("/admin/evidence")) return "evidence";
    if (location.pathname.includes("/admin/map")) return "map";
    return "dashboard";
  });

  useEffect(() => {
    if (location.pathname.includes("/admin/users")) setTab("users");
    else if (location.pathname.includes("/admin/alerts")) setTab("alerts");
    else if (location.pathname.includes("/admin/evidence")) setTab("evidence");
    else if (location.pathname.includes("/admin/map")) setTab("map");
    else setTab("dashboard");
  }, [location.pathname]);

  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [evidenceDateFrom, setEvidenceDateFrom] = useState("");
  const [evidenceDateTo, setEvidenceDateTo] = useState("");

  const [adminAlerts, setAdminAlerts] = useState<AlertWithUser[]>([]);
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "resolved">("all");
  const [adminFabOpen, setAdminFabOpen] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const { complaints: adminComplaints, loading: complaintsLoading, resolveComplaint } = useComplaints();

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
      const { data: dbEvidence, error } = await supabase
        .from("evidence_videos" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error || !dbEvidence) {
        setEvidence([]);
        setLoadingEvidence(false);
        return;
      }

      const uids = [...new Set(dbEvidence.map((e: any) => e.user_id))];
      let profilesMap = new Map();
      
      if (uids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", uids);
          
        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      const formattedEvidence: EvidenceItem[] = dbEvidence.map((e: any) => ({
        name: e.storage_path.split("/").pop() || "Video",
        created_at: e.created_at,
        user_id: e.user_id,
        user_name: profilesMap.get(e.user_id) || "Unknown",
        url: e.public_url
      }));

      setEvidence(formattedEvidence);
    } catch (err) {
      console.error("Error fetching evidence:", err);
      setEvidence([]);
    }
    setLoadingEvidence(false);
  };


  const fetchAlerts = async () => {
    // 1. Fetch alerts
    const { data: alerts } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (alerts && alerts.length > 0) {
      // 2. Fetch victim profiles
      const vids = [...new Set(alerts.map(a => a.user_id))];
      const { data: vProfiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", vids);
      
      // 3. Fetch responder profiles (from accepted_by)
      const allResponderIds = [...new Set(alerts.flatMap(a => a.accepted_by || []))];
      let rProfilesMap = new Map();
      if (allResponderIds.length > 0) {
        const { data: rProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", allResponderIds);
        if (rProfiles) {
          rProfilesMap = new Map(rProfiles.map(p => [p.user_id, p.full_name]));
        }
      }

      // 4. Fetch rescue records to get resolved_at
      const { data: records } = await supabase.from("rescue_records").select("alert_id, created_at").in("alert_id", alerts.map(a => a.id));
      const recordsMap = new Map(records?.map(r => [r.alert_id, r.created_at]));

      // 5. Combine
      setAdminAlerts(alerts.map(a => ({
        ...a,
        user_name: vProfiles?.find(p => p.user_id === a.user_id)?.full_name || "Unknown",
        avatar_url: vProfiles?.find(p => p.user_id === a.user_id)?.avatar_url || null,
        responders: (a.accepted_by || []).map(id => ({ full_name: rProfilesMap.get(id) || "Unknown", id })),
        resolved_at: recordsMap.get(a.id) || null
      })));
    } else {
      setAdminAlerts([]);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) toast.error(t("deleteFailed"));
    else { toast.success(t("userRemoved")); setUsers((prev) => prev.filter((u) => u.user_id !== userId)); setDeleteConfirm(null); }
  };
  const handleApproveUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "verified" as any })
      .eq("user_id", userId);

    if (error) {
      console.error("Approval error:", error);
      toast.error(t("approvalFailed"));
    } else { 
      toast.success(t("userApproved")); 
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, verification_status: "verified" } : u)); 
      fetchStats(); 
    }
  };
  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "rejected" as any })
      .eq("user_id", userId);

    if (error) {
      console.error("Rejection error:", error);
      toast.error(t("approvalFailed"));
    } else { 
      toast.success(t("userRejected")); 
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, verification_status: "rejected" } : u)); 
      fetchStats(); 
    }
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
  const filteredAlerts = adminAlerts
    .map(alert => {
      const dist = getDistanceKm(ADMIN_LOCATION.lat, ADMIN_LOCATION.lng, alert.latitude, alert.longitude);
      const eta = getEta(dist);
      return { ...alert, distance: dist, eta };
    })
    .filter(a => alertFilter === "all" || a.status === alertFilter)
    .filter(a => a.distance <= 30)
    .sort((a, b) => a.distance - b.distance);

  const statCards = [
    { label: t("totalUsers"), value: stats.total, icon: Users, color: "text-primary" },
    { label: t("activeAlerts"), value: stats.active, icon: AlertTriangle, color: "text-destructive" },
    { label: t("verified"), value: stats.verified, icon: CheckCircle2, color: "text-accent" },
    { label: t("onDuty"), value: onDutyRescuers.length, icon: Shield, color: "text-warning" },
  ];

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-4 md:space-y-8 pb-4 md:pb-8">
      {tab === "dashboard" && (
        <>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm">{user.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{t("administrator")}</p>
            </div>
          </div>

          {/* Stat Cards - moved into dashboard tab */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-150">
            {statCards.map((card, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border hover:shadow-lg transition-all group active:scale-95">
                <div className={cn("w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", card.color)}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{card.label}</p>
                <p className="text-2xl font-black">{card.value}</p>
              </div>
            ))}
          </div>

          {/* On Duty Section - moved into dashboard tab */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-warning" />
              <p className="text-sm font-bold uppercase tracking-wider text-warning">{t("onDutyRescuers")}</p>
            </div>
            {onDutyRescuers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-card/50 border border-dashed text-center">
                <p className="text-xs text-muted-foreground">{t("noRescuersOnDuty")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onDutyRescuers.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border transition-all hover:border-warning/30">
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning text-xs font-bold">
                      {r.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{r.full_name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">{r.role} • Active</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold uppercase tracking-wider text-primary">Alert History & Status</p>
            </div>
            <div className="flex gap-1.5 mb-2">
              {(["all", "active", "resolved"] as const).map((f) => (
                <button key={f} onClick={() => setAlertFilter(f)} className={cn("px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all", alertFilter === f ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}>
                  {f === "all" ? t("all") : f === "active" ? t("active") : t("resolved")}
                </button>
              ))}
            </div>
            {filteredAlerts.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card border border-dashed text-center">
                <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">{t("noPastAlerts")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className={cn("p-5 rounded-2xl border transition-all hover:shadow-xl group", alert.status === "active" ? "bg-destructive/5 border-destructive/20" : "bg-accent/5 border-accent/20")}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", alert.status === "active" ? "bg-destructive/10" : "bg-accent/10")}>
                          <Avatar 
                            url={alert.avatar_url} 
                            name={alert.user_name || "Unknown"} 
                            className="w-full h-full rounded-2xl text-base font-bold shadow-lg" 
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-base font-black tracking-tight truncate">{alert.user_name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <MapPin className="w-3.5 h-3.5" />
                              {alert.distance.toFixed(1)} KM • {alert.eta}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              Alert: {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {alert.resolved_at && (
                              <div className="flex items-center gap-1.5 text-xs text-accent font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Rescued: {new Date(alert.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center md:flex-col md:items-end gap-3 shrink-0">
                        <span className={cn("text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm", alert.status === "active" ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground")}>
                          {alert.status === "active" ? "Active" : "Rescued"}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const link = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent('Emergency Location: ' + link)}`, '_blank');
                            }}
                            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all shadow-sm"
                            title="Share location"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Responders Section */}
                    <div className="mt-5 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responders ({alert.responders?.length || 0})</p>
                      </div>
                      {alert.responders && alert.responders.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {alert.responders.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border shadow-sm text-[10px] font-bold transition-all hover:border-primary/30">
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] text-primary">
                                {r.full_name.charAt(0)}
                              </div>
                              {r.full_name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] italic text-muted-foreground">Waiting for responders...</p>
                      )}
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
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Evidence Library</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by user..." value={evidenceSearch} onChange={(e) => setEvidenceSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Input type="date" value={evidenceDateFrom} onChange={(e) => setEvidenceDateFrom(e.target.value)} className="h-9 text-xs" />
                  <Input type="date" value={evidenceDateTo} onChange={(e) => setEvidenceDateTo(e.target.value)} className="h-9 text-xs" />
                  {(evidenceDateFrom || evidenceDateTo || evidenceSearch) && (
                    <button onClick={() => { setEvidenceSearch(""); setEvidenceDateFrom(""); setEvidenceDateTo(""); }} className="px-3 h-9 rounded-lg bg-secondary text-xs text-muted-foreground">Clear</button>
                  )}
                </div>
              </div>

              {loadingEvidence ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
              ) : fe.length === 0 ? (
                <div className="p-12 rounded-2xl bg-card border border-dashed text-center space-y-3">
                  <Video className="w-8 h-8 text-muted-foreground mx-auto opacity-20" />
                  <p className="text-sm text-muted-foreground">{t("noEvidence")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fe.map((item, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-card border space-y-4 transition-all hover:shadow-xl hover:border-primary/20 group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Video className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{item.user_name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"><Download className="w-4 h-4" /></a>
                      </div>
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
                        <video src={item.url} controls className="w-full h-full object-contain" preload="metadata" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-4 rounded-2xl bg-transparent border border-transparent hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-[0.98] group">
                    <Avatar 
                      url={u.avatar_url} 
                      name={u.full_name} 
                      className="w-9 h-9 rounded-full text-sm font-bold" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{u.full_name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium capitalize">{u.role} • {u.city || "N/A"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                        u.verification_status === "verified" && "bg-accent/10 text-accent",
                        u.verification_status === "pending" && "bg-warning/10 text-warning",
                        u.verification_status === "rejected" && "bg-destructive/10 text-destructive",
                      )}>{u.verification_status.toUpperCase()}</span>
                      <div className="flex gap-0.5">
                        {u.verification_status === "pending" && (
                          <>
                            <button onClick={() => handleApproveUser(u.user_id)} className="p-1.5 rounded-lg hover:bg-accent/10 active:scale-95"><Check className="w-4 h-4 text-accent" /></button>
                            <button onClick={() => handleRejectUser(u.user_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 active:scale-95"><X className="w-4 h-4 text-destructive" /></button>
                          </>
                        )}
                        <button onClick={() => setViewingProof(u)} className="p-1.5 rounded-lg hover:bg-secondary active:scale-95"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteConfirm(u.user_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 active:scale-95"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}




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

      {/* Admin Floating Action Menu */}
      <div className="fixed bottom-8 right-6 z-50 flex flex-col items-end gap-3">
        {adminFabOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Complaint Box */}
            <button
              onClick={() => { setShowComplaintsModal(true); setAdminFabOpen(false); }}
              className="flex items-center gap-3 bg-card/95 backdrop-blur border shadow-xl rounded-full pr-1.5 pl-4 py-1.5 hover:bg-orange-500/10 transition-colors"
            >
              <span className="text-sm font-semibold">Complaint Box</span>
              {adminComplaints.filter(c => c.status === "open").length > 0 && (
                <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                  {adminComplaints.filter(c => c.status === "open").length}
                </span>
              )}
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500">
                <MessageSquare className="w-5 h-5" />
              </div>
            </button>


            {/* Emergency Alerts */}
            <button
              onClick={() => { navigate("/admin/alerts"); setAdminFabOpen(false); }}
              className="flex items-center gap-3 bg-card/95 backdrop-blur border shadow-xl rounded-full pr-1.5 pl-4 py-1.5 hover:bg-destructive/10 transition-colors"
            >
              <span className="text-sm font-semibold">Emergency Alerts</span>
              {stats.active > 0 && (
                <span className="text-[9px] font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full">{stats.active}</span>
              )}
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 text-destructive">
                <Bell className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setAdminFabOpen(!adminFabOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-200 active:scale-95",
            adminFabOpen ? "bg-secondary text-foreground rotate-45" : "bg-primary glow-primary"
          )}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Complaints Modal */}
      <Dialog open={showComplaintsModal} onOpenChange={setShowComplaintsModal}>
        <DialogContent className="max-w-lg w-[95%] max-h-[80vh] flex flex-col p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl rounded-3xl">
          <div className="p-5 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                Complaint Box
                {adminComplaints.filter(c => c.status === "open").length > 0 && (
                  <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                    {adminComplaints.filter(c => c.status === "open").length} open
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-[11px]">Complaints from responders within 30 km radius</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {selectedComplaint ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to list
                </button>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-sm font-black border border-orange-500/20">
                    {selectedComplaint.profiles?.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{selectedComplaint.profiles?.full_name || "Unknown User"}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedComplaint.profiles?.phone || "No phone"}</p>
                  </div>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                    selectedComplaint.status === "resolved" ? "bg-accent/10 text-accent" : "bg-orange-500/10 text-orange-500"
                  )}>
                    {selectedComplaint.status === "resolved" ? "✓ RESOLVED" : "OPEN"}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-black">{selectedComplaint.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedComplaint.description}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedComplaint.created_at).toLocaleString()}
                  </div>
                </div>
                {selectedComplaint.status === "open" && (
                  <button
                    onClick={() => { resolveComplaint(selectedComplaint.id); setSelectedComplaint({ ...selectedComplaint, status: "resolved" }); }}
                    className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                  </button>
                )}
              </div>
            ) : complaintsLoading ? (
              <div className="py-10 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : adminComplaints.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">No complaints within 30 km</p>
              </div>
            ) : (
              <div className="space-y-2">
                {adminComplaints.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className="w-full text-left p-5 rounded-2xl bg-transparent border border-transparent hover:bg-orange-500/5 hover:border-orange-500/20 transition-all active:scale-[0.98] space-y-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-base font-black border border-orange-500/20 shrink-0 transition-transform duration-300 group-hover:scale-110">
                        {c.profiles?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{c.profiles?.full_name || "Unknown User"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                      </div>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        c.status === "resolved" ? "bg-accent/10 text-accent" : "bg-orange-500/10 text-orange-500"
                      )}>
                        {c.status === "resolved" ? "✓" : "OPEN"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

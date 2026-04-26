import { useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Clock } from "lucide-react";

interface LeaderboardProps {
  headerAction?: ReactNode;
}

interface LeaderboardEntry {
  responder_id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  totalRescues: number;
  points: number;
  avgRating: number;
  avgResponseTime: number; // in minutes
}

export function Leaderboard({ headerAction }: LeaderboardProps = {}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const query = supabase.from("rescue_records").select("*");

        const { data: records, error: recordsError } = await query;

        if (recordsError || !records) {
          console.error("Leaderboard fetch error:", recordsError);
          setEntries([]);
          setLoading(false);
          return;
        }

        const responderIds = [...new Set(records.map(r => r.responder_id))];
        const alertIds = [...new Set(records.map(r => r.alert_id))];
        
        if (responderIds.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }

        const [profilesRes, rolesRes, alertsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", responderIds),
          supabase.from("user_roles").select("user_id, role").in("user_id", responderIds),
          supabase.from("emergency_alerts").select("id, created_at").in("id", alertIds)
        ]);

        const profiles = profilesRes.data || [];
        const roles = rolesRes.data || [];
        const alerts = alertsRes.data || [];

        const statsMap = new Map<string, {
          responder_id: string;
          totalRescues: number;
          totalRating: number;
          ratingCount: number;
          totalResponseTime: number;
          points: number;
        }>();
        
        interface RescueRecordRow {
          responder_id: string;
          rating?: number;
          points_awarded?: number;
          alert_id: string;
          created_at: string;
        }

        records.forEach((r: RescueRecordRow) => {
          if (!statsMap.has(r.responder_id)) {
            statsMap.set(r.responder_id, {
              responder_id: r.responder_id,
              totalRescues: 0,
              totalRating: 0,
              ratingCount: 0,
              totalResponseTime: 0,
              points: 0
            });
          }
          
          const stat = statsMap.get(r.responder_id);
          if (!stat) return;
          
          stat.totalRescues += 1;
          
          const rating = r.rating || 5; 
          stat.totalRating += rating;
          stat.ratingCount += 1;
          
          stat.points += (r.points_awarded || 10) + (rating * 2);
          
          const alert = alerts.find(a => a.id === r.alert_id);
          if (alert?.created_at && r.created_at) {
            const alertTime = new Date(alert.created_at).getTime();
            const rescueTime = new Date(r.created_at).getTime();
            stat.totalResponseTime += Math.max(0, rescueTime - alertTime);
          }
        });

        const mappedEntries: LeaderboardEntry[] = Array.from(statsMap.values()).map((stat) => {
          const profile = profiles.find((p: { user_id: string }) => p.user_id === stat.responder_id);
          const roleData = roles.find((ro: { user_id: string }) => ro.user_id === stat.responder_id);
          
          return {
            responder_id: stat.responder_id,
            full_name: profile?.full_name || "Unknown Rescuer",
            role: roleData?.role || "responder",
            avatar_url: profile?.avatar_url,
            totalRescues: stat.totalRescues,
            points: stat.points,
            avgRating: stat.ratingCount > 0 ? stat.totalRating / stat.ratingCount : 0,
            avgResponseTime: stat.totalRescues > 0 ? (stat.totalResponseTime / stat.totalRescues) / (1000 * 60) : 0,
          };
        });

        mappedEntries.sort((a, b) => b.points - a.points || b.totalRescues - a.totalRescues);
        
        setEntries(mappedEntries);
      } catch (err) {
        console.error("Leaderboard processing error:", err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-card/80 backdrop-blur-lg border glow-border p-5 animate-pulse">
        <div className="h-6 w-40 bg-secondary rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20 p-5 shadow-lg relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 -z-10 group-hover:scale-105 transition-transform duration-1000"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            Rescuer Leaderboard
          </h3>
        </div>
        {headerAction && (
          <div className="flex-shrink-0">
            {headerAction}
          </div>
        )}
      </div>
      
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No rescue records found for this period.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div 
              key={entry.responder_id} 
              className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/50 hover:bg-secondary/40 transition-all duration-300 animate-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-bold rounded-full bg-secondary/80 shadow-sm relative">
                {index === 0 ? (
                  <>
                    <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping opacity-75"></div>
                    <Medal className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] z-10" />
                  </>
                ) : index === 1 ? (
                  <Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)] z-10" />
                ) : index === 2 ? (
                  <Medal className="w-6 h-6 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)] z-10" />
                ) : (
                  <span className="text-muted-foreground text-sm">#{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt={entry.full_name} className="w-10 h-10 rounded-full object-cover border border-primary/20" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="font-bold text-primary text-sm">{entry.full_name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <p className="text-sm font-bold truncate">{entry.full_name}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{entry.role.replace("_", " ")}</p>
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded text-primary">
                  <Award className="w-3.5 h-3.5" />
                  <span className="text-sm font-black">{entry.points} pts</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-medium mt-1">
                  <span className="flex items-center gap-0.5 text-amber-500">
                    ★ {entry.avgRating.toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{entry.totalRescues} rescues</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {entry.avgResponseTime.toFixed(1)}m avg
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

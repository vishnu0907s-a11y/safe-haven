import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface LeaderboardEntry {
  responder_id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  totalRescues: number;
  avgResponseTime: number; // in minutes
}

export function Leaderboard() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"weekly" | "monthly" | "all-time">("all-time");
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_leaderboard_stats", {
        time_filter: timeFilter,
      });

      if (error || !data) {
        console.error("Leaderboard fetch error:", error);
        setEntries([]);
      } else {
        const mappedEntries: LeaderboardEntry[] = data.map((d: any) => ({
          responder_id: d.responder_id,
          full_name: d.full_name || "Unknown Rescuer",
          role: d.role || "responder",
          avatar_url: d.avatar_url,
          totalRescues: Number(d.total_rescues),
          avgResponseTime: Number(d.avg_response_time_ms) / (1000 * 60), // Convert ms to minutes
        }));
        setEntries(mappedEntries);
      }
      setLoading(false);
    }

    fetchLeaderboard();
  }, [timeFilter]);

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
        
        <div className="flex bg-secondary/50 p-1 rounded-lg">
          {(["weekly", "monthly", "all-time"] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all duration-300 ${
                timeFilter === filter 
                  ? "bg-primary text-primary-foreground shadow-sm scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              {filter.replace("-", " ")}
            </button>
          ))}
        </div>
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
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded text-primary">
                  <Award className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">{entry.totalRescues}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{entry.avgResponseTime.toFixed(1)}m avg</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

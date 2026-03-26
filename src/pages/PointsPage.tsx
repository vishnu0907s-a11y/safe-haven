import { Star, Trophy, Target, TrendingUp } from "lucide-react";
import { useRescueRecords } from "@/hooks/use-rescue-records";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function PointsPage() {
  const { user } = useAuth();
  const { records, loading, totalPoints, rescueCount, avgRating } = useRescueRecords();

  if (!user) return null;

  return (
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <p className="text-3xl font-black text-primary">{totalPoints.toFixed(1)}</p>
        <p className="label-caps mt-1">Total Points</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <div className="glass-card rounded-xl p-3 text-center">
          <Target className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-black">{rescueCount}</p>
          <p className="text-[9px] text-muted-foreground font-bold tracking-wider">RESCUES</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-lg font-black">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
          <p className="text-[9px] text-muted-foreground font-bold tracking-wider">AVG RATING</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-black">{rescueCount > 0 ? (totalPoints / rescueCount).toFixed(1) : "—"}</p>
          <p className="text-[9px] text-muted-foreground font-bold tracking-wider">PTS/RESCUE</p>
        </div>
      </div>

      {/* Rescue history */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <h2 className="label-caps mb-3 px-1">Rescue History</h2>
        {loading ? (
          <div className="glass-card p-6 rounded-2xl text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No rescues yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Accept emergency alerts to earn points</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <div key={record.id} className="glass-card p-3.5 rounded-2xl flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  record.rating
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-muted border-border/40"
                )}>
                  <Star className={cn("w-5 h-5", record.rating ? "text-amber-400" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Rescue Mission</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString()} • +{Number(record.points_awarded).toFixed(1)} pts
                  </p>
                </div>
                {record.rating && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "w-3 h-3",
                          s <= record.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Star, Trophy, Target, TrendingUp, ChevronDown, ChevronUp, X } from "lucide-react";
import { useRescueRecords } from "@/hooks/use-rescue-records";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";
import { Leaderboard } from "@/components/Leaderboard";

export default function PointsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { records, loading, totalPoints, rescueCount, avgRating } = useRescueRecords();
  const [showHistory, setShowHistory] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setIsScrolledDown(true);
      } else if (currentScrollY < lastScrollY) {
        setIsScrolledDown(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!user) return null;

  return (
    <div className="px-4 space-y-4">
      <div className="glass-card rounded-2xl p-5 text-center relative z-20 bg-background/95 backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 relative z-30">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <p className="text-3xl font-black text-primary relative z-30">{totalPoints.toFixed(1)}</p>
        <p className="label-caps mt-1 relative z-30">{t("totalPoints")}</p>
      </div>

      <div 
        className={cn(
          "grid grid-cols-3 gap-3 relative z-10 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isScrolledDown 
            ? "opacity-0 -translate-y-28 scale-50 pointer-events-none -mt-24 mb-0" 
            : "opacity-100 translate-y-0 scale-100 mt-4 mb-4 animate-in slide-in-from-top-12 fade-in zoom-in-75 duration-700 delay-100"
        )}
      >
        <div className="glass-card rounded-xl p-3 text-center bg-background/80">
          <Target className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-black">{rescueCount}</p>
          <p className="text-[9px] text-muted-foreground font-bold tracking-wider">{t("rescues")}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-lg font-black">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
          <p className="text-[9px] text-muted-foreground font-bold tracking-wider">{t("avgRating")}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-black">{rescueCount > 0 ? (totalPoints / rescueCount).toFixed(1) : "—"}</p>
          <p className="text-[9px] text-muted-foreground font-bold tracking-wider">{t("ptsPerRescue")}</p>
        </div>
      </div>

      <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <Leaderboard 
          headerAction={
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
            >
              {t("rescueHistory")}
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          }
        />
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/30">
              <h2 className="font-bold text-lg text-foreground">{t("rescueHistory")}</h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {loading ? (
                <div className="glass-card p-6 rounded-2xl text-center">
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                </div>
              ) : records.length === 0 ? (
                <div className="glass-card p-6 rounded-2xl text-center">
                  <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">{t("noRescuesYet")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("acceptAlertsEarn")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {records.map((record) => (
                    <div key={record.id} className="glass-card p-3.5 rounded-2xl flex items-center gap-3 bg-secondary/20">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        record.rating
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-muted border-border/40"
                      )}>
                        <Star className={cn("w-5 h-5", record.rating ? "text-amber-400" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{t("rescueMission")}</p>
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
        </div>
      )}
    </div>
  );
}

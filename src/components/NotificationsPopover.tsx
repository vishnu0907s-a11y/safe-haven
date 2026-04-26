import { Bell, Check, Trash2, Clock, Info, AlertTriangle, ShieldCheck } from "lucide-react";
import { useNotifications, AppNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationsPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-1.5 sm:p-3 rounded-full hover:bg-primary/10 transition-all active:scale-90 relative group">
          <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 sm:top-2.5 right-1 sm:right-2.5 w-2.5 h-2.5 bg-primary rounded-full glow-primary animate-pulse flex items-center justify-center text-[7px] text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95%] p-0 rounded-3xl overflow-hidden border-none bg-background/95 backdrop-blur-xl shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 p-6">
          <DialogHeader className="flex flex-row items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-black">Notifications</DialogTitle>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all as read
              </button>
            )}
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4 -mr-4">
            {notifications.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto opacity-20">
                  <Bell className="w-8 h-8" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                      n.is_read 
                        ? "bg-secondary/20 border-border/40 opacity-70" 
                        : "bg-card border-primary/20 shadow-sm glow-border"
                    )}
                  >
                    {!n.is_read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    )}
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        n.type === "alert" ? "bg-red-500/10 text-red-500" :
                        n.type === "complaint" ? "bg-orange-500/10 text-orange-500" :
                        "bg-accent/10 text-accent"
                      )}>
                        {n.type === "alert" ? <AlertTriangle className="w-5 h-5" /> :
                         n.type === "complaint" ? <Info className="w-5 h-5" /> :
                         <ShieldCheck className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-black truncate", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

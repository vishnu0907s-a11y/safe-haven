import { useState } from "react";
import { 
  Menu, Settings, HelpCircle, Star, PhoneCall, 
  MapPin, ShieldAlert, ChevronRight, X 
} from "lucide-react";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n-context";

export function ProfileActionsMenu() {
  const { t } = useI18n();
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-3 rounded-full hover:bg-primary/10 transition-all active:scale-90 group">
          <Menu className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] glass-card border-l border-primary/20 p-0">
        <SheetHeader className="p-6 border-b border-border/50">
          <SheetTitle className="text-xl font-black flex items-center gap-2">
            <Menu className="w-5 h-5 text-primary" />
            Menu
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-2">
          {!showSettings ? (
            <>
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-bold">Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/30 hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-bold">How to use app</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/30 hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-bold">Rate app</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/30 hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-bold">Contact and Support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary mb-2"
              >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back to menu
              </button>
              
              <div className="p-4 rounded-2xl border border-primary/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Location Allow</p>
                      <p className="text-[10px] text-muted-foreground">Always track location</p>
                    </div>
                  </div>
                  <Switch checked={locationAllowed} onCheckedChange={setLocationAllowed} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Shake for SOS</p>
                      <p className="text-[10px] text-muted-foreground">Shake to activate SOS</p>
                    </div>
                  </div>
                  <Switch checked={shakeEnabled} onCheckedChange={setShakeEnabled} />
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

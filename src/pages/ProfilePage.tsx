import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, LogOut, ChevronRight, HelpCircle, Shield, Bus, Moon, Sun, Edit, Camera, Save, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useTheme } from "@/lib/theme-context";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, logout, refreshProfile, supabaseUser } = useAuth();
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const startEdit = () => {
    setEditName(user.full_name);
    setEditPhone(user.phone || "");
    setEditCity(user.city || "");
    setAvatarFile(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!supabaseUser || !editName.trim()) return;
    setSaving(true);
    const updates: Record<string, string | null> = {
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
      city: editCity.trim() || null,
    };

    try {
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${supabaseUser.id}/avatar.${ext}`;
        await supabase.storage.from("documents").upload(path, avatarFile, { upsert: true });
        updates.avatar_url = path;
      }

      // 1. Update database profile
      const { error, count } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", supabaseUser.id)
        .select();

      if (error) throw error;
      
      console.log("Database profile updated. Rows affected:", count);

      // 2. Sync to Auth Metadata for session consistency
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          city: editCity.trim() || null
        }
      });

      if (authError) console.warn("Auth metadata sync failed:", authError);

      toast.success(t("profileUpdated"));
      
      // 3. Refresh local state
      await refreshProfile();
      setEditing(false);
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(`Update failed: ${error.message || "Unknown database error"}`);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: Shield, label: t("verificationStatus"), desc: user.verification_status === "verified" ? t("docsVerified") : t("verificationPending") },
    { icon: HelpCircle, label: t("supportConcierge"), desc: t("getHelp") },
  ];

  return (
    <div className="px-4 space-y-4">
      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditing(false)}>
          <div className="rounded-2xl bg-card/90 backdrop-blur-xl border glow-border p-5 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">{t("editProfile")}</h3>
              <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label className="relative cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-primary font-black text-2xl border-2 border-dashed border-border overflow-hidden glow-primary">
                  {avatarFile ? (
                    <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" alt="" />
                  ) : user.avatar_url ? (
                    <img src={supabase.storage.from("documents").getPublicUrl(user.avatar_url).data.publicUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    user.full_name.charAt(0)
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center glow-primary">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
              </label>
              <p className="text-[10px] text-muted-foreground">{t("profilePhoto")}</p>
            </div>

            <div className="space-y-3">
              <Input placeholder={t("fullNamePlaceholder")} value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border-border/60" />
              <Input placeholder={t("phonePlaceholder")} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel" className="bg-secondary border-border/60" />
              <Input placeholder={t("cityPlaceholder")} value={editCity} onChange={(e) => setEditCity(e.target.value)} className="bg-secondary border-border/60" />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t("updating") : t("saveChanges")}
            </button>
          </div>
        </div>
      )}

      {/* Info row */}
      <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center justify-between mb-3">
          <p className="label-caps">{t("profile")}</p>
          <button onClick={startEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold active:scale-95 transition-transform">
            <Edit className="w-3 h-3" /> {t("editProfile")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label-caps mb-1">{t("emailRegistry")}</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>
          <div>
            <p className="label-caps mb-1">{t("phoneLine")}</p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">{user.phone || t("notSet")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location info */}
      <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-5 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <div>
          <p className="label-caps mb-2">{t("fleetAssociation")}</p>
          <div className="flex items-center justify-between">
            <p className="text-base font-bold">{user.city || t("notAssigned")}</p>
            <Bus className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div>
          <p className="label-caps mb-2">{t("roleAssignment")}</p>
          <div className="flex items-center justify-between">
            <p className="text-base font-bold capitalize">{user.role}</p>
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div>
              <p className="text-sm font-semibold">{t("darkMode")}</p>
              <p className="text-[10px] text-muted-foreground">{t("toggleTheme")}</p>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </div>

      {/* Diagnostics & settings */}
      <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-5 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <p className="label-caps mb-1">{t("diagnosticsSettings")}</p>
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border/40 hover:border-primary/30 transition-all active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center glow-primary">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}

        {/* Status badges */}
        <div className="flex items-center gap-2 pt-2">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border",
            user.verification_status === "verified"
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-warning/30 bg-warning/10 text-warning"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              user.verification_status === "verified" ? "bg-accent" : "bg-warning"
            )} />
            {user.verification_status === "verified" ? t("verified") : t("pending")}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-primary/30 bg-primary/10 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t("gpsRelay")}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.98] animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300 font-bold text-sm"
      >
        <LogOut className="w-4 h-4" />
        {t("signOut")}
      </button>
    </div>
  );
}

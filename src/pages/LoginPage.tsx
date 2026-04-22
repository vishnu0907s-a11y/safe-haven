import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, Car, ShieldCheck, Users, Lock, Upload, Loader2 } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth-context";
import resqherLogo from "@/assets/logo.png";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateDocument } from "@/lib/document-utils";

export default function LoginPage() {
  const [step, setStep] = useState<"role" | "login" | "register">("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [dob, setDob] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [stationName, setStationName] = useState("");
  const [policeId, setPoliceId] = useState("");
  const [address, setAddress] = useState("");
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const roles: { id: UserRole; label: string; icon: React.ElementType; color: string }[] = [
    { id: "women", label: t("womenUser"), icon: User, color: "bg-pink-500/10 text-pink-400 border border-pink-500/20" },
    { id: "driver", label: t("driver"), icon: Car, color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
    { id: "police", label: t("police"), icon: ShieldCheck, color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
    { id: "protector", label: t("publicProtector"), icon: Users, color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
    { id: "admin", label: t("admin"), icon: Lock, color: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      toast({ title: t("loginFailed"), description: result.error, variant: "destructive" });
    }
  };

  const uploadDoc = async (file: File, userId: string, docType: string) => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${docType}.${ext}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !fullName || !email || !password) return;

    if (selectedRole !== "admin" && !aadhaarFile && !licenseFile) {
      toast({ title: t("idProofRequired"), description: t("uploadIdProof"), variant: "destructive" });
      return;
    }

    setLoading(true);

    // 1. Automatic Document Validation
    let verificationStatus: "verified" | "pending" | "rejected" = "pending";
    
    if (selectedRole !== "admin") {
      let docToValidate: File | null = null;
      let docType: "aadhaar" | "license" | "police_id" = "aadhaar";

      if (selectedRole === "women" || selectedRole === "protector") {
        docToValidate = aadhaarFile;
        docType = "aadhaar";
      } else if (selectedRole === "driver") {
        docToValidate = licenseFile || aadhaarFile;
        docType = licenseFile ? "license" : "aadhaar";
      } else if (selectedRole === "police") {
        docToValidate = aadhaarFile;
        docType = "police_id";
      }

      if (docToValidate) {
        toast({ title: t("verifyingDocs"), description: t("loading") });
        const validation = await validateDocument(docToValidate, selectedRole, docType);
        
        if (!validation.isValid) {
          toast({ 
            title: t("registrationFailed"), 
            description: t(validation.message as any), 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }

        verificationStatus = "verified";
        toast({ title: t("done"), description: t(validation.message as any) });
      }
    }

    const metadata: Record<string, string> = { 
      full_name: fullName,
      verification_status: verificationStatus 
    };
    if (phone) metadata.phone = phone;
    if (city) metadata.city = city;
    if (dob) metadata.date_of_birth = dob;
    if (vehicleNumber) metadata.vehicle_number = vehicleNumber;
    if (stationName) metadata.station_name = stationName;
    if (policeId) metadata.police_id = policeId;
    if (address) metadata.address = address;

    const result = await register(email, password, selectedRole, metadata);
    if (result.error) {
      toast({ title: t("registrationFailed"), description: result.error, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const updates: Record<string, any> = { verification_status: verificationStatus };
        if (aadhaarFile) {
          const path = await uploadDoc(aadhaarFile, user.id, "aadhaar");
          updates.aadhaar_url = path;
        }
        if (licenseFile) {
          const path = await uploadDoc(licenseFile, user.id, "license");
          updates.driving_license_url = path;
        }
        await supabase.from("profiles").update(updates).eq("user_id", user.id);
      } catch (err) {
        console.error("Doc upload/update error:", err);
        toast({ title: t("docUploadFailed"), description: t("uploadLater"), variant: "destructive" });
      }
    }

    if (verificationStatus === "verified") {
      toast({ title: t("accountCreated"), description: t("welcomeTo") + " " + t("appName") });
    } else {
      toast({ title: t("accountCreated"), description: t("docsPending") });
    }
    
    setLoading(false);
  };

  const roleFields = () => {
    if (!selectedRole || step !== "register") return null;

    return (
      <>
        <Input placeholder={t("fullNamePlaceholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-secondary border-border/60" />
        <Input placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary border-border/60" />

        {selectedRole === "women" && (
          <>
            <Input placeholder={t("cityPlaceholder")} value={city} onChange={(e) => setCity(e.target.value)} className="bg-secondary border-border/60" />
            <Input type="date" placeholder={t("dobPlaceholder")} value={dob} onChange={(e) => setDob(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || t("aadhaarUpload")}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "driver" && (
          <>
            <Input placeholder={t("vehiclePlaceholder")} value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || t("aadhaarUpload")}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{licenseFile?.name || t("licenseUpload")}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "police" && (
          <>
            <Input placeholder={t("stationPlaceholder")} value={stationName} onChange={(e) => setStationName(e.target.value)} className="bg-secondary border-border/60" />
            <Input placeholder={t("policeIdPlaceholder")} value={policeId} onChange={(e) => setPoliceId(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || t("policeIdUpload")}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "protector" && (
          <>
            <Input placeholder={t("addressPlaceholder")} value={address} onChange={(e) => setAddress(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || t("aadhaarUpload")}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "admin" && (
          <p className="text-xs text-muted-foreground text-center">{t("adminNote")}</p>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <LanguageToggle compact />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <button onClick={toggle} className="p-2.5 rounded-full glass-card hover:gold-glow transition-all active:scale-95">
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 max-w-lg mx-auto w-full">
        <div className="mb-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-32 h-32 flex items-center justify-center animate-in zoom-in-95 duration-1000">
            <img src={resqherLogo} alt="ResQHer Logo" className="w-full h-full object-contain mix-blend-screen" />
          </div>
          <div className="flex flex-col items-center gap-1 mt-1">
            <h1 className="text-4xl font-black tracking-tighter">
              <span className="text-[#cbd5e1]">Res</span>
              <span className="text-[#a855f7]">QHer</span>
            </h1>
            <p className="text-gray-400 font-bold text-sm tracking-tight">
              {t("tagline")}
            </p>
          </div>
        </div>

        {step === "role" && (
          <div className="w-full space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="label-caps text-center mb-2">{t("chooseRole")}</p>
            {roles.map((role, i) => (
              <button
                key={role.id}
                onClick={() => { setSelectedRole(role.id); setStep("login"); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass-card hover:gold-glow transition-all active:scale-[0.98] group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", role.color)}>
                  <role.icon className="w-4 h-4" />
                </div>
                <span className="font-bold flex-1 text-left text-sm">{role.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}

        {(step === "login" || step === "register") && selectedRole && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-400">
            <button onClick={() => setStep("role")} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 active:scale-95">
              {t("backToRole")}
            </button>

            <div className="flex items-center gap-2 mb-4">
              {(() => {
                const r = roles.find((r) => r.id === selectedRole)!;
                return (
                  <>
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", r.color)}>
                      <r.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{r.label}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {step === "login" ? t("signInToContinue") : t("createYourAccount")}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <form onSubmit={step === "login" ? handleLogin : handleRegister} className="space-y-2.5">
              {step === "register" && roleFields()}
              <Input type="email" placeholder={t("emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 bg-secondary border-border/60 text-sm" />
              <Input type="password" placeholder={t("passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-10 bg-secondary border-border/60 text-sm" />
              <Button type="submit" className="w-full h-10 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {step === "login" ? t("signIn") : t("createAccount")}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {step === "login" ? (
                <>{t("noAccount")} <button onClick={() => setStep("register")} className="text-primary font-bold hover:underline">{t("register")}</button></>
              ) : (
                <>{t("haveAccount")} <button onClick={() => setStep("login")} className="text-primary font-bold hover:underline">{t("signIn")}</button></>
              )}
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground pb-4">{t("protectedBy")}</p>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, Car, ShieldCheck, Users, Lock, Upload, Loader2 } from "lucide-react";
import resqherLogo from "@/assets/resqher-logo.png";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const roles: { id: UserRole; label: string; icon: React.ElementType; color: string }[] = [
  { id: "women", label: "Women User", icon: User, color: "bg-pink-500/10 text-pink-400 border border-pink-500/20" },
  { id: "driver", label: "Driver", icon: Car, color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  { id: "police", label: "Police", icon: ShieldCheck, color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  { id: "protector", label: "Public Protector", icon: Users, color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  { id: "admin", label: "Admin", icon: Lock, color: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
];

export default function LoginPage() {
  const [step, setStep] = useState<"role" | "login" | "register">("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
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
    setLoading(true);

    const metadata: Record<string, string> = { full_name: fullName };
    if (phone) metadata.phone = phone;
    if (city) metadata.city = city;
    if (dob) metadata.date_of_birth = dob;
    if (vehicleNumber) metadata.vehicle_number = vehicleNumber;
    if (stationName) metadata.station_name = stationName;
    if (policeId) metadata.police_id = policeId;
    if (address) metadata.address = address;

    const result = await register(email, password, selectedRole, metadata);
    if (result.error) {
      toast({ title: "Registration failed", description: result.error, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const updates: Record<string, string> = {};
        if (aadhaarFile) {
          const path = await uploadDoc(aadhaarFile, user.id, "aadhaar");
          updates.aadhaar_url = path;
        }
        if (licenseFile) {
          const path = await uploadDoc(licenseFile, user.id, "license");
          updates.driving_license_url = path;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("user_id", user.id);
        }
      } catch {
        toast({ title: "Document upload failed", description: "You can upload documents later from your profile.", variant: "destructive" });
      }
    }

    toast({ title: "Account created!", description: "Your documents are pending verification." });
    setLoading(false);
  };

  const roleFields = () => {
    if (!selectedRole || step !== "register") return null;

    return (
      <>
        <Input placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-secondary border-border/60" />
        <Input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary border-border/60" />

        {selectedRole === "women" && (
          <>
            <Input placeholder="City / District" value={city} onChange={(e) => setCity(e.target.value)} className="bg-secondary border-border/60" />
            <Input type="date" placeholder="Date of Birth" value={dob} onChange={(e) => setDob(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || "Aadhaar Proof (upload)"}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "driver" && (
          <>
            <Input placeholder="Vehicle Number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || "Aadhaar Proof (upload)"}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{licenseFile?.name || "Driving License (upload)"}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "police" && (
          <>
            <Input placeholder="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} className="bg-secondary border-border/60" />
            <Input placeholder="Police ID" value={policeId} onChange={(e) => setPoliceId(e.target.value)} className="bg-secondary border-border/60" />
          </>
        )}

        {selectedRole === "protector" && (
          <>
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-secondary border-border/60" />
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors bg-secondary/30">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{aadhaarFile?.name || "Aadhaar Proof (upload)"}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}

        {selectedRole === "admin" && (
          <p className="text-xs text-muted-foreground text-center">Admin accounts require special approval</p>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={toggle} className="p-2.5 rounded-full glass-card hover:gold-glow transition-all active:scale-95">
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto w-full">
        <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <img src={resqherLogo} alt="ResQHer" className="w-48 h-auto mb-2" />
          <p className="text-sm text-muted-foreground mt-2">Your Safety, Our Priority</p>
        </div>

        {step === "role" && (
          <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="label-caps text-center mb-4">Choose your role to continue</p>
            {roles.map((role, i) => (
              <button
                key={role.id}
                onClick={() => { setSelectedRole(role.id); setStep("login"); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl glass-card hover:gold-glow transition-all active:scale-[0.98] group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", role.color)}>
                  <role.icon className="w-5 h-5" />
                </div>
                <span className="font-bold flex-1 text-left">{role.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}

        {(step === "login" || step === "register") && selectedRole && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-400">
            <button onClick={() => setStep("role")} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 active:scale-95">
              ← Back to role selection
            </button>

            <div className="flex items-center gap-3 mb-6">
              {(() => {
                const r = roles.find((r) => r.id === selectedRole)!;
                return (
                  <>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", r.color)}>
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">{r.label}</p>
                      <p className="label-caps">
                        {step === "login" ? "Sign in to continue" : "Create your account"}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <form onSubmit={step === "login" ? handleLogin : handleRegister} className="space-y-3">
              {step === "register" && roleFields()}
              <Input type="email" placeholder="Email address *" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary border-border/60" />
              <Input type="password" placeholder="Password *" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-secondary border-border/60" />
              <Button type="submit" className="w-full h-11 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {step === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {step === "login" ? (
                <>Don't have an account?{" "}<button onClick={() => setStep("register")} className="text-primary font-bold hover:underline">Register</button></>
              ) : (
                <>Already have an account?{" "}<button onClick={() => setStep("login")} className="text-primary font-bold hover:underline">Sign In</button></>
              )}
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground pb-6">Protected by Safe Guard Security</p>
    </div>
  );
}

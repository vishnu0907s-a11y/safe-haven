import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Key, Mail, User, ShieldAlert, Laptop, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pass1: "",
    pass2: "",
    pass3: "",
    secretCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8 text-center">
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto border border-destructive/20">
            <Laptop className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Access Restricted</h1>
          <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
            The Super Admin Portal is only accessible via Desktop or Computer screens for security reasons.
          </p>
          <button 
            onClick={() => navigate("/")}
            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all"
          >
            Back to Safety
          </button>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate high-security multi-layer validation
    // In a real app, this would be an encrypted API call
    setTimeout(() => {
      if (formData.secretCode === "SUPERSAFE2024") {
        toast.success("Identity Verified. Welcome Master Admin.");
        navigate("/super-admin-dashboard");
      } else {
        toast.error("Multi-layer Authentication Failed.");
      }
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-['Inter']">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4 glow-purple">
            <ShieldAlert className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Super Admin</h1>
          <p className="text-gray-500 font-bold text-sm">Level 4 Multi-Layer Authentication</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-[#0A0A0A] p-8 rounded-[32px] border border-white/5 shadow-2xl relative group">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="bg-[#151515] border-white/5 pl-10 h-11 focus:ring-purple-500/50 rounded-xl" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
                <Input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="bg-[#151515] border-white/5 pl-10 h-11 focus:ring-purple-500/50 rounded-xl" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Access Passwords</label>
            <div className="space-y-3">
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
                <Input 
                  type="password"
                  placeholder="Primary Password"
                  required
                  value={formData.pass1}
                  onChange={e => setFormData({...formData, pass1: e.target.value})}
                  className="bg-[#151515] border-white/5 pl-10 h-11 focus:ring-purple-500/50 rounded-xl" 
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
                <Input 
                  type="password"
                  placeholder="Secondary Key"
                  required
                  value={formData.pass2}
                  onChange={e => setFormData({...formData, pass2: e.target.value})}
                  className="bg-[#151515] border-white/5 pl-10 h-11 focus:ring-purple-500/50 rounded-xl" 
                />
              </div>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-600" />
                <Input 
                  type="password"
                  placeholder="Final Protocol"
                  required
                  value={formData.pass3}
                  onChange={e => setFormData({...formData, pass3: e.target.value})}
                  className="bg-[#151515] border-white/5 pl-10 h-11 focus:ring-purple-500/50 rounded-xl" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-purple-500/70 uppercase tracking-widest px-1">Master Secret Code</label>
            <Input 
              placeholder="••••••••"
              required
              value={formData.secretCode}
              onChange={e => setFormData({...formData, secretCode: e.target.value})}
              className="bg-purple-500/5 border-purple-500/20 text-center text-lg font-black tracking-[0.5em] h-14 focus:ring-purple-500/50 rounded-2xl" 
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm tracking-widest transition-all shadow-xl shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>INITIATE AUTHENTICATION</>
            )}
          </button>
        </form>

        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-400 mx-auto transition-colors text-xs font-bold"
        >
          <ArrowLeft className="w-3 h-3" /> ABORT ACCESS
        </button>
      </div>
    </div>
  );
}

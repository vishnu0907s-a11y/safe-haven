import { useState, useEffect } from "react";
import { 
  Users, ShieldCheck, UserX, Trash2, 
  Search, Filter, CheckCircle2, XCircle, 
  AlertCircle, Activity, LayoutDashboard, UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AdminProfile {
  user_id: string;
  full_name: string;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
  phone: string | null;
  role?: string;
}

export default function SuperAdminDashboard() {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      // Fetch profiles with admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (roleData && roleData.length > 0) {
        const uids = roleData.map(r => r.user_id);
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", uids)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAdmins(profiles as any as AdminProfile[]);
      }
    } catch (err) {
      console.error("Error fetching admins:", err);
      toast.error("Failed to load administrators.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.name) {
      toast.error("Please fill all fields.");
      return;
    }
    setCreating(true);
    console.log("Initiating Admin Creation with URL:", import.meta.env.VITE_SUPABASE_URL ? "Loaded" : "Missing");

    try {
      // 1. Create the Auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          data: { full_name: newAdmin.name, role: 'admin' }
        }
      });

      if (authError) {
        if (authError.message.includes("API key")) {
          toast.error("Environment Sync Error: Please check Vercel Environment Variables.");
        }
        throw authError;
      }

      if (data.user) {
        toast.success("New Administrator registered and verified!");
        setNewAdmin({ name: "", email: "", password: "" });
        // Small delay to allow trigger to complete
        setTimeout(() => fetchAdmins(), 500);
      }
    } catch (err: any) {
      console.error("Creation error:", err);
      toast.error(err.message || "Registration failed.");
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (uid: string, action: "approve" | "reject" | "delete") => {
    try {
      if (action === "delete") {
        if (!confirm("Are you sure you want to PERMANENTLY delete this admin account?")) return;
        // In a real app, you might use a server-side edge function to delete the auth user too.
        // For now, we'll remove them from profiles/roles.
        await supabase.from("profiles").delete().eq("user_id", uid);
        await supabase.from("user_roles").delete().eq("user_id", uid);
        toast.success("Admin removed permanently.");
      } else {
        const status = action === "approve" ? "verified" : "rejected";
        const { error } = await supabase
          .from("profiles")
          .update({ verification_status: status })
          .eq("user_id", uid);
        
        if (error) throw error;
        toast.success(`Admin ${action === "approve" ? "approved" : "rejected"} successfully.`);
      }
      fetchAdmins();
    } catch (err) {
      console.error(`Error ${action}ing admin:`, err);
      toast.error(`Operation failed.`);
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.phone && a.phone.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-[#050505] p-6 lg:p-10 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-purple-500" />
              Super Admin Portal
            </h1>
            <p className="text-gray-500 font-bold">Control & Verify Application Administrators</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs tracking-widest transition-all shadow-xl shadow-purple-900/20 active:scale-[0.98]">
                  <UserPlus className="w-4 h-4" />
                  CREATE NEW ADMIN
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#0A0A0A] border-white/10 text-white rounded-3xl p-8 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <UserPlus className="text-purple-500" />
                    Register New Admin
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Full Name</label>
                    <Input 
                      placeholder="e.g. John Doe" 
                      value={newAdmin.name}
                      onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                      className="bg-[#151515] border-white/5 h-12 rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Email Address</label>
                    <Input 
                      type="email"
                      placeholder="admin@resqher.com" 
                      value={newAdmin.email}
                      onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                      className="bg-[#151515] border-white/5 h-12 rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Initial Password</label>
                    <Input 
                      type="password"
                      placeholder="••••••••" 
                      value={newAdmin.password}
                      onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                      className="bg-[#151515] border-white/5 h-12 rounded-xl" 
                    />
                  </div>
                  <button 
                    onClick={handleCreateAdmin}
                    disabled={creating}
                    className="w-full py-4 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm tracking-widest transition-all shadow-xl shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {creating ? "INITIALIZING..." : "CONFIRM REGISTRATION"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                placeholder="Search administrators..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#0A0A0A] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white w-64 focus:ring-purple-500/50 transition-all outline-none"
              />
            </div>
            <button 
              onClick={fetchAdmins}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all"
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-3 text-purple-500">
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Admins</span>
            </div>
            <p className="text-4xl font-black text-white">{admins.length}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-3 text-yellow-500">
              <AlertCircle className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pending Requests</span>
            </div>
            <p className="text-4xl font-black text-white">{admins.filter(a => a.verification_status === "pending").length}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Units</span>
            </div>
            <p className="text-4xl font-black text-white">{admins.filter(a => a.verification_status === "verified").length}</p>
          </div>
        </div>

        {/* Admin List */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Administrator</th>
                  <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Details</th>
                  <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Verification Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="p-20 text-center text-gray-500 font-bold">Initializing Admin Sync...</td></tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr><td colSpan={4} className="p-20 text-center text-gray-500 font-bold">No administrators found.</td></tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.user_id} className="group hover:bg-white/[0.02] transition-all">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center font-black text-white">
                            {admin.full_name[0]}
                          </div>
                          <div>
                            <p className="font-black text-white">{admin.full_name}</p>
                            <p className="text-xs text-gray-500 font-bold">{admin.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-300">{admin.phone || "No Phone Registered"}</p>
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Joined {new Date(admin.created_at).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          admin.verification_status === "verified" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          admin.verification_status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                          {admin.verification_status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleAction(admin.user_id, "approve")}
                            className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20"
                            title="Approve Admin"
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleAction(admin.user_id, "reject")}
                            className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-lg hover:shadow-yellow-500/20"
                            title="Reject Admin"
                          >
                            <UserX className="w-5 h-5" />
                          </button>
                          <div className="w-px h-6 bg-white/5 mx-1" />
                          <button 
                            onClick={() => handleAction(admin.user_id, "delete")}
                            className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all shadow-lg hover:shadow-destructive-500/20"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Info, Code, GraduationCap, BookOpen, User, Laptop } from "lucide-react";
import resqherLogo from "@/assets/logo.png";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const safetyQuotes = [
  "Every woman deserves to walk freely without fear.",
  "Your safety is not a privilege — it's a right.",
  "One tap can save a life. Stay protected.",
  "Be bold, be brave, be safe — always.",
  "Together we can make every street safer.",
];

export default function WelcomePage() {
  const [phase, setPhase] = useState<"splash" | "welcome">("splash");
  const [quoteIdx, setQuoteIdx] = useState(0);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate(50);
    const timer = setTimeout(() => setPhase("welcome"), 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "splash") return;
    const interval = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % safetyQuotes.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === "splash") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-700 px-8">
          <div className="w-32 h-32 flex items-center justify-center">
            <img src={resqherLogo} className="w-full h-full object-contain mix-blend-screen" alt="ResQHer Logo" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-white">Res</span>
              <span className="text-[#a855f7]">QHer</span>
            </h1>
          </div>
          <div className="mt-4">
            <div className="w-7 h-7 border-[2.5px] border-white/20 border-t-[#a855f7] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-between px-8 py-8 max-w-[420px] mx-auto w-full animate-in fade-in duration-700 relative overflow-hidden font-['Inter']">
      {/* Top Navigation */}
      <div className="flex items-center justify-between w-full absolute top-10 left-0 px-8 z-10">
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400 hover:bg-[#252525] transition-colors border border-white/5 shadow-lg">
              <Info className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[85%] sm:max-w-[310px] overflow-hidden bg-[#0A0A0A] border-white/10 text-white rounded-3xl p-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#a855f7] to-[#7c3aed]"></div>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold text-white">
                <User className="w-5 h-5 text-[#a855f7]" />
                About Us
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-1 pb-1">
              <div className="flex flex-col items-center gap-1 mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#a855f7] to-[#7c3aed] p-1 shadow-lg shadow-purple-500/20">
                  <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center text-[#a855f7] text-xl font-black">
                    V
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-base text-white">Developed by Vishnu</h3>
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-start gap-2 p-1.5 rounded-xl bg-[#151515] border border-white/5">
                  <GraduationCap className="w-4 h-4 text-[#a855f7] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">College</p>
                    <p className="text-[11px] font-semibold mt-0.5 text-white">Madras Engineering College</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-1.5 rounded-xl bg-[#151515] border border-white/5">
                  <BookOpen className="w-4 h-4 text-[#a855f7] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Current Studying</p>
                    <p className="text-[11px] font-semibold mt-0.5 text-white">B.Tech Information Technology</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-1.5 rounded-xl bg-[#151515] border border-white/5">
                  <Laptop className="w-4 h-4 text-[#a855f7] mt-0.5" />
                  <div>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Skills</p>
                    <ul className="text-[11px] font-semibold mt-0.5 space-y-0.5 text-white">
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> Full Stack Developer</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> Frontend Developer</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> Backend Developer</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <LanguageToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4 w-full mt-14">
        <div className="w-56 h-56 flex flex-col items-center justify-center animate-in zoom-in-95 duration-1000 relative">
          <div className="absolute inset-0 bg-purple-500/10 blur-[60px] rounded-full"></div>
          <img src={resqherLogo} className="w-full h-full object-contain relative z-10 mix-blend-screen" alt="ResQHer Logo" />
          
          <div className="mt-[-20px] flex flex-col items-center relative z-10">
            <h2 className="text-2xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 leading-none">
              RESQHER
            </h2>
            <p className="text-[10px] font-black tracking-[0.4em] text-cyan-400 mt-1">
              SAFETY APP
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2 mt-4">
          <h1 className="text-4xl font-black tracking-tight flex items-center">
            <span className="text-white">Res</span>
            <span className="text-[#a855f7]">Q</span>
            <span className="text-white">Her</span>
          </h1>
          <p className="text-gray-500 font-bold text-base tracking-normal">
            Your Safety, Our Priority
          </p>
        </div>

        <div className="bg-[#0F172A]/40 backdrop-blur-md border border-white/5 rounded-[24px] px-8 py-8 w-full max-w-[340px] mt-2 shadow-2xl">
          <p className="text-sm text-center text-gray-300 italic leading-relaxed font-medium">
            "Every woman has the right to feel safe — anytime, anywhere."
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full space-y-7 mt-auto">
        <button
          onClick={() => navigate("/login")}
          className="w-full py-5 rounded-[20px] font-black text-lg text-white bg-[#5b21b6] hover:bg-[#4c1d95] transition-all active:scale-[0.98] shadow-2xl shadow-purple-950/50"
        >
          Get Started
        </button>
        <p className="text-center text-[12px] font-bold text-gray-600 tracking-tight">
          Protected by ResQHer Security
        </p>
      </div>
    </div>
  );
}


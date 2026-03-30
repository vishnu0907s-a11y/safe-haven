import { useState, useEffect } from "react";
import resqherLogo from "@/assets/resqher-logo.png";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 2200);
    const timer2 = setTimeout(() => onFinish(), 2800);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: "radial-gradient(ellipse at center, #2a0a0a 0%, #0d0000 70%, #000000 100%)" }}
    >
      <img
        src={resqherLogo}
        alt="ResQHer Logo"
        className="w-64 h-auto animate-in fade-in zoom-in-95 duration-700"
      />
      <div className="mt-8 w-32 h-1 rounded-full overflow-hidden bg-white/10">
        <div className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full animate-pulse" style={{ width: "100%", animation: "loading 2s ease-in-out" }} />
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

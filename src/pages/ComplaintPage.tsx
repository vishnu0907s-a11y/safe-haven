import { useState } from "react";
import { MessageSquare, Send, CheckCircle2, Clock, ChevronLeft, AlertCircle, Mic, MicOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useComplaints } from "@/hooks/use-complaints";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ComplaintPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { complaints, loading, submitting, submitComplaint } = useComplaints();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => prev + (prev ? " " : "") + transcript);
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    const ok = await submitComplaint(title.trim(), description.trim());
    if (ok) {
      setSubmitted(true);
      setTitle("");
      setDescription("");
    }
  };

  if (!user) return null;

  return (
    <div className="px-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 py-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <MessageSquare className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h1 className="text-base font-black leading-tight">Raise a Complaint</h1>
            <p className="text-[10px] text-muted-foreground">Sent to the nearest admin (30 km)</p>
          </div>
        </div>
      </div>

      {/* Submission form / success */}
      {submitted ? (
        <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-lg border glow-border text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto glow-accent">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
          <div>
            <p className="font-black text-base">Complaint Submitted!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your complaint has been forwarded to the nearest admin within 30 km.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold glow-primary active:scale-[0.98] transition-transform"
          >
            Submit Another Complaint
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-bold">New Complaint</p>
          </div>
          <Input
            placeholder="Complaint title (e.g. Unsafe route, Misconduct)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-secondary/50 border-border/40 text-sm h-10"
          />
          <div className="relative">
            <textarea
              placeholder="Describe your complaint in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-36 text-sm bg-secondary/50 border border-border/40 rounded-xl p-3 resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
            />
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "absolute bottom-3 right-3 p-2.5 rounded-full transition-all active:scale-90",
                isListening 
                  ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50" 
                  : "bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground px-0.5">
            📍 Your location will be shared to route to the nearest admin.
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      )}

      {/* Past complaints */}
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <h2 className="label-caps px-1">Your Previous Complaints</h2>
        {loading ? (
          <div className="p-6 rounded-xl bg-card/80 backdrop-blur-lg border text-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-8 rounded-xl bg-card/80 backdrop-blur-lg border glow-border text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No complaints submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-card/80 backdrop-blur-lg border glow-border space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold truncate flex-1">{c.title}</p>
                  <span
                    className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0",
                      c.status === "resolved"
                        ? "bg-accent/10 text-accent"
                        : "bg-orange-500/10 text-orange-500"
                    )}
                  >
                    {c.status === "resolved" ? "✓ RESOLVED" : "OPEN"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

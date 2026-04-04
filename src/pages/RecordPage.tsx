import { useState, useRef, useCallback, useEffect } from "react";
import { Video, StopCircle, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RecordPage() {
  const { supabaseUser } = useAuth();
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
        await uploadVideo(blob);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setHasPermission(false);
      toast.error("Camera access denied");
    }
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async (blob: Blob) => {
    if (!supabaseUser) return;
    setUploading(true);
    const fileName = `${supabaseUser.id}/evidence-${Date.now()}.webm`;
    const { error } = await supabase.storage.from("videos").upload(fileName, blob);
    setUploading(false);
    if (error) {
      toast.error(t("videoUploadFailed"));
    } else {
      toast.success(t("videoSaved"));
    }
  };

  return (
    <div className="fixed inset-0 z-0 bg-black flex flex-col">
      {/* Camera preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoPreviewRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
        {!isRecording && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center border-2 border-destructive/40">
                <Video className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-black text-white">{t("recordVideo")}</p>
                <p className="text-xs text-white/60 mt-1">{t("videoNote")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-bold text-white">{t("recordingInProgress")}</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center space-y-3">
              <Upload className="w-10 h-10 text-primary mx-auto animate-bounce" />
              <p className="text-sm font-bold text-white">{t("loading")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="safe-area-bottom bg-background/90 backdrop-blur-xl border-t border-border/30 py-6 flex items-center justify-center">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-xl active:scale-95 transition-transform border-4 border-white/20"
          >
            <StopCircle className="w-10 h-10 text-white" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={uploading}
            className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-xl active:scale-95 transition-transform border-4 border-white/20 disabled:opacity-50"
          >
            <Video className="w-10 h-10 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}

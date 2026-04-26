import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AvatarProps {
  url?: string | null;
  name: string;
  className?: string;
}

export function Avatar({ url, name, className }: AvatarProps) {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [url]);
  
  const getFullUrl = (avatarUrl: string) => {
    if (avatarUrl.startsWith("http")) return avatarUrl;
    return supabase.storage.from("documents").getPublicUrl(avatarUrl).data.publicUrl;
  };

  const initials = name.charAt(0).toUpperCase();

  if (!url || error) {
    return (
      <div className={cn("flex items-center justify-center bg-primary/10 text-primary font-bold", className)}>
        {initials}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden flex items-center justify-center", className)}>
      <img
        src={getFullUrl(url)}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

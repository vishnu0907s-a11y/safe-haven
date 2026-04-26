import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { useShakeDetection } from "@/hooks/use-shake-detection";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const isMapOrRecord = ["/map", "/record"].includes(location.pathname);

  // Initialize global shake detection
  useShakeDetection();

  return (
    <div className={cn(
      "bg-background relative flex flex-col", 
      !isAdminPage && "max-w-lg mx-auto",
      isMapOrRecord ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {/* Floating header for non-map/record pages */}
      {!isMapOrRecord && <AppHeader />}
      <main className={cn(
        "flex-1 w-full relative",
        !isMapOrRecord && !isAdminPage && "pt-16 pb-20",
        isAdminPage && "pt-6"
      )}>
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav floating />
    </div>
  );
}


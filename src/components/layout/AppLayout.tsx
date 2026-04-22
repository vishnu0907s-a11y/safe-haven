import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "@/components/PageTransition";

export function AppLayout() {
  const location = useLocation();
  // All pages now use immersive full-screen layout like the map
  const isFullScreen = true;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {/* Floating header for non-map/record pages */}
      {!["/map", "/record"].includes(location.pathname) && <AppHeader />}
      <main className="pb-20 pt-16 h-full w-full">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav floating />
    </div>
  );
}

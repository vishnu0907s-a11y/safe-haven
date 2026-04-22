import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <div className={cn("min-h-screen bg-background relative", !isAdminPage && "max-w-lg mx-auto")}>
      {/* Floating header for non-map/record pages */}
      {!["/map", "/record"].includes(location.pathname) && <AppHeader />}
      <main className={cn("pb-20 pt-16 h-full w-full", isAdminPage && "pt-6")}>
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav floating />
    </div>
  );
}


import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  const location = useLocation();
  const isFullScreen = location.pathname === "/map" || location.pathname === "/record";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {!isFullScreen && <AppHeader />}
      <main className={isFullScreen ? "" : "pb-20 pt-3"}>
        <Outlet />
      </main>
      <BottomNav floating={isFullScreen} />
    </div>
  );
}

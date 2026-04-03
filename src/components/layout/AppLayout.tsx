import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  const location = useLocation();
  const isMapPage = location.pathname === "/map";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {!isMapPage && <AppHeader />}
      <main className={isMapPage ? "" : "pb-20 pt-3"}>
        <Outlet />
      </main>
      <BottomNav floating={isMapPage} />
    </div>
  );
}

import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import AppTopbar from "@/components/AppTopbar";
import BottomNavigation from "@/components/BottomNavigation";
import { InstallPrompt } from "@/components/mobile/InstallPrompt";
import { GestureHints } from "@/components/mobile/GestureHints";
import { useIsMobile } from "@/hooks/use-mobile";

export function AuthenticatedLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}
        
        <div className="flex-1 flex flex-col">
          <AppTopbar />
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <Outlet />
          </main>
          {isMobile && <BottomNavigation />}
        </div>
      </div>
      
      {/* Mobile-specific components */}
      {isMobile && (
        <>
          <InstallPrompt />
          <GestureHints />
        </>
      )}
    </SidebarProvider>
  );
}
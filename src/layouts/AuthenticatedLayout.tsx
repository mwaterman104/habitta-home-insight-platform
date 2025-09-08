import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

export function AuthenticatedLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        {/* Global header with trigger - always visible */}
        <header className="fixed top-0 left-0 right-0 h-12 flex items-center border-b bg-background z-50 px-4">
          <SidebarTrigger className="mr-4" />
          <h1 className="text-xl font-bold text-primary">Habitta</h1>
        </header>

        <AppSidebar />
        
        {/* Main content area with top padding for fixed header */}
        <main className="flex-1 pt-12">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
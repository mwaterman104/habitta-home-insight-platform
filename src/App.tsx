import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import HomeProfilePage from "@/pages/HomeProfilePage";
import HomeRedirectHandler from "@/components/HomeRedirectHandler";
import NotFound from "@/pages/NotFound";
import AppSidebar from "@/components/AppSidebar";

const queryClient = new QueryClient();

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background p-6">
    <h1 className="text-3xl font-bold">{title} - Coming Soon</h1>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Root redirect handler */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <HomeRedirectHandler />
                </ProtectedRoute>
              } 
            />

            {/* Landing page for unauthenticated users */}
            <Route path="/landing" element={<LandingPage />} />
            
            {/* Home Profile */}
            <Route 
              path="/home/:homeId" 
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 bg-background p-6">
                        <HomeProfilePage />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } 
            />

            {/* Portfolio Dashboard (multi-home) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 bg-background p-6">
                        <Dashboard />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 bg-background p-6">
                        <ComingSoon title="Tasks" />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents" 
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 bg-background p-6">
                        <ComingSoon title="Documents" />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/diagnosis" 
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 bg-background p-6">
                        <ComingSoon title="AI Diagnosis" />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full">
                      <AppSidebar />
                      <main className="flex-1 bg-background p-6">
                        <ComingSoon title="Settings" />
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

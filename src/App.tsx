import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background p-6">
                    <h1 className="text-3xl font-bold">Home Profile - Coming Soon</h1>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background p-6">
                    <h1 className="text-3xl font-bold">Tasks - Coming Soon</h1>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background p-6">
                    <h1 className="text-3xl font-bold">Documents - Coming Soon</h1>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/diagnosis" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background p-6">
                    <h1 className="text-3xl font-bold">AI Diagnosis - Coming Soon</h1>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background p-6">
                    <h1 className="text-3xl font-bold">Settings - Coming Soon</h1>
                  </div>
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

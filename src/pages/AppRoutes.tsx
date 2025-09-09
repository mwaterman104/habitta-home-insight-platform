import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthenticatedLayout } from "@/layouts/AuthenticatedLayout";
import AuthPage from "./AuthPage";
import AddHomePage from "./AddHomePage";
import HomeIntelligenceDashboard from "./HomeIntelligenceDashboard";
import Dashboard from "./Dashboard";
import AdminPage from "./AdminPage";
import NotFound from "./NotFound";
import OnboardingStart from "./OnboardingStart";
import OnboardingSnapshot from "./OnboardingSnapshot";
import OnboardingUnknowns from "./OnboardingUnknowns";
import OnboardingPersonalization from "./OnboardingPersonalization";
import HomeProfilePage from "./HomeProfilePage";
import MaintenancePlanner from "./MaintenancePlanner";

// Import client dashboard for demo purposes
import ClientDashboard from "../../client/pages/Dashboard";

export function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/demo" element={<ClientDashboard />} />
          
          {/* Onboarding routes (protected but no sidebar) */}
          <Route path="/onboarding/start" element={
            <ProtectedRoute>
              <OnboardingStart />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/snapshot" element={
            <ProtectedRoute>
              <OnboardingSnapshot />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/unknowns" element={
            <ProtectedRoute>
              <OnboardingUnknowns />
            </ProtectedRoute>
          } />
          <Route path="/onboarding/personalization" element={
            <ProtectedRoute>
              <OnboardingPersonalization />
            </ProtectedRoute>
          } />
          
          {/* Protected routes with unified layout */}
          <Route element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/home-profile" element={<HomeProfilePage />} />
            <Route path="/property-intelligence" element={<div className="p-6"><h1 className="text-2xl font-bold">Property Intelligence - Coming Soon</h1></div>} />
            <Route path="/maintenance-planner" element={<MaintenancePlanner />} />
            <Route path="/projects" element={<div className="p-6"><h1 className="text-2xl font-bold">Projects - Coming Soon</h1></div>} />
            <Route path="/marketplace" element={<div className="p-6"><h1 className="text-2xl font-bold">Marketplace - Coming Soon</h1></div>} />
            <Route path="/pro-network" element={<div className="p-6"><h1 className="text-2xl font-bold">Pro Network - Coming Soon</h1></div>} />
            <Route path="/chatdiy" element={<div className="p-6"><h1 className="text-2xl font-bold">ChatDIY Assistant - Coming Soon</h1></div>} />
            <Route path="/settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings - Coming Soon</h1></div>} />
            
            {/* Legacy routes */}
            <Route path="/home" element={<Dashboard />} />
            <Route path="/home/new" element={<AddHomePage />} />
            <Route path="/home/:homeId" element={<HomeIntelligenceDashboard />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
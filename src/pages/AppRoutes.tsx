import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserHomeProvider } from "@/contexts/UserHomeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthenticatedLayout } from "@/layouts/AuthenticatedLayout";
import AuthPage from "./AuthPage";
import AddHomePage from "./AddHomePage";
import HomeIntelligenceDashboard from "./HomeIntelligenceDashboard";

import DashboardV3 from "./DashboardV3";
import SystemPage from "./SystemPage";
import SystemsHub from "./SystemsHub";
import SystemPlanPage from "./SystemPlanPage";
import AdminPage from "./AdminPage";
import NotFound from "./NotFound";
import OnboardingFlow from "./OnboardingFlow";
import HomeProfilePage from "./HomeProfilePage";
import MaintenancePlanner from "./MaintenancePlanner";
import PropertyIntelligence from "./PropertyIntelligence";
import ProjectDashboard from "@/components/ProjectDashboard";
import ProjectWorkspace from "@/components/ProjectWorkspace";
import TemplateSelection from "@/components/TemplateSelection";
import SettingsPage from "./SettingsPage";
import ValidationCockpit from "./ValidationCockpit";
import PropertyDetail from "./PropertyDetail";
import ScoringDashboard from "./ScoringDashboard";
import PropertyLabelingPage from "./PropertyLabelingPage";
import PropertyReportPage from "./PropertyReportPage";
import LandingPage from "./LandingPage";
import MechanicalIntelligencePage from "./MechanicalIntelligencePage";
import MobilePhotoCaptureRoute from "./MobilePhotoCaptureRoute";
import HomeReportPage from "./HomeReportPage";
import MaintenancePage from "./MaintenancePage";

export function AppRoutes() {
  return (
    <AuthProvider>
      <UserHomeProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/capture-photo" element={<MobilePhotoCaptureRoute />} />
          
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          } />
          
          {/* Dashboard V3: Now the primary /dashboard route */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardV3 />
            </ProtectedRoute>
          } />
          
          {/* Systems Hub: Standalone layout */}
          <Route path="/systems" element={
            <ProtectedRoute>
              <SystemsHub />
            </ProtectedRoute>
          } />
          
          {/* System Detail: Uses standardized /systems/:systemKey route */}
          <Route path="/systems/:systemKey" element={
            <ProtectedRoute>
              <SystemPage />
            </ProtectedRoute>
          } />
          
          {/* System Plan View: Mobile-optimized planning screen */}
          <Route path="/systems/:systemKey/plan" element={
            <ProtectedRoute>
              <SystemPlanPage />
            </ProtectedRoute>
          } />
          
          {/* Home Profile: Uses V3 layout */}
          <Route path="/home-profile" element={
            <ProtectedRoute>
              <HomeProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Home Report: Read-only document surface */}
          <Route path="/report" element={
            <ProtectedRoute>
              <HomeReportPage />
            </ProtectedRoute>
          } />
          
          {/* Intelligent Maintenance Hub */}
          <Route path="/maintenance" element={
            <ProtectedRoute>
              <MaintenancePage />
            </ProtectedRoute>
          } />
          
          {/* Protected routes with unified layout */}
          <Route element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }>
            {/* Legacy dashboard redirects to new dashboard */}
            <Route path="/dashboard-v3" element={<Navigate to="/dashboard" replace />} />
            
            {/* SECONDARY: System Drilldowns (route-based) */}
            <Route path="/system/:systemKey" element={<SystemPage />} />
            
            {/* Settings still uses old layout for now */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/chatdiy" element={<div className="p-6"><h1 className="text-2xl font-bold">ChatDIY Assistant</h1><p className="text-muted-foreground mt-2">Get help with home maintenance tasks.</p></div>} />
            
            {/* ARCHIVED: Still accessible but removed from navigation */}
            <Route path="/property-intelligence" element={<Navigate to="/dashboard" replace />} />
            <Route path="/maintenance-planner" element={<Navigate to="/maintenance" replace />} />
            <Route path="/projects" element={<ProjectDashboard />} />
            <Route path="/project/:projectId" element={<ProjectWorkspace />} />
            <Route path="/templates" element={<TemplateSelection />} />
            <Route path="/marketplace" element={<Navigate to="/dashboard" replace />} />
            <Route path="/pro-network" element={<Navigate to="/dashboard" replace />} />
            
            {/* Validation Cockpit routes (admin/internal) */}
            <Route path="/validation" element={<ValidationCockpit />} />
            <Route path="/validation/label/:id" element={<PropertyLabelingPage />} />
            <Route path="/validation/property/:addressId" element={<PropertyDetail />} />
            <Route path="/validation/report/:id" element={<PropertyReportPage />} />
            <Route path="/validation/scoring" element={<ScoringDashboard />} />
            <Route path="/mechanical-intelligence" element={<MechanicalIntelligencePage />} />
            
            {/* Legacy routes - redirect to Home Pulse */}
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            <Route path="/home/v2" element={<Navigate to="/dashboard" replace />} />
            <Route path="/home/new" element={<AddHomePage />} />
            <Route path="/home/:homeId" element={<HomeIntelligenceDashboard />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </UserHomeProvider>
  </AuthProvider>
  );
}
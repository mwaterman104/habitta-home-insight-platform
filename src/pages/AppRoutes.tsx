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
          
          {/* Protected routes with unified layout */}
          <Route element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/home" element={<Dashboard />} />
            <Route path="/home/new" element={<AddHomePage />} />
            <Route path="/home/:homeId" element={<HomeIntelligenceDashboard />} />
            <Route path="/tasks/new" element={<div>Tasks New Page - Coming Soon</div>} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
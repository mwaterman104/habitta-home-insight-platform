import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomeRedirectHandler from "@/components/HomeRedirectHandler";
import AuthPage from "./AuthPage";
import AddHomePage from "./AddHomePage";
import HomeProfilePage from "./HomeProfilePage";
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
          <Route path="/" element={<HomeRedirectHandler />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/demo" element={<ClientDashboard />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/home/new" element={
            <ProtectedRoute>
              <AddHomePage />
            </ProtectedRoute>
          } />
          <Route path="/home/:homeId" element={
            <ProtectedRoute>
              <HomeProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Dashboard from "./Dashboard";
import Seasonal from "./Seasonal";  
import TasksNew from "./TasksNew";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <header className="h-12 flex items-center justify-between border-b px-6 print:hidden">
          <Link to="/" className="text-xl font-bold text-primary">Habitta</Link>
          <nav className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Exit Demo</Link>
            <a href="/auth" className="text-sm font-medium text-primary hover:underline">Sign In</a>
          </nav>
        </header>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/seasonal" element={<Seasonal />} />
          <Route path="/tasks/new" element={<TasksNew />} />
          <Route path="/chatdiy" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
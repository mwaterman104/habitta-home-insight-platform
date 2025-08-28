import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import Seasonal from "./Seasonal";
import TasksNew from "./TasksNew";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <header className="h-12 flex items-center border-b px-6 print:hidden">
          <h1 className="text-xl font-bold text-primary">Habitta</h1>
        </header>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/seasonal" element={<Seasonal />} />
          <Route path="/tasks/new" element={<TasksNew />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
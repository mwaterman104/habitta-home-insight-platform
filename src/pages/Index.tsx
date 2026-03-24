import React from 'react';
import ProjectDashboard from '@/components/ProjectDashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-primary rounded-lg flex items-center justify-center bg-background">
                <div className="w-6 h-4 border-b-2 border-l-2 border-r-2 border-primary rounded-b-md">
                  <div className="w-2 h-3 mx-auto border-2 border-primary rounded-t-full bg-background -mt-1"></div>
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Habitta</h1>
              <p className="text-sm text-muted-foreground">Home Improvement Planner</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <ProjectDashboard />
      </div>
    </div>
  );
};

export default Index;

import React, { useState } from 'react';
import AddressLookup from '@/components/AddressLookup';
import PropertyDashboard from '@/components/PropertyDashboard';
import MaintenanceUpload from '@/components/MaintenanceUpload';
import { PropertyHistory } from '@/lib/propertyAPI';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Upload, Search } from 'lucide-react';

const Index = () => {
  const [selectedProperty, setSelectedProperty] = useState<PropertyHistory | null>(null);

  const handlePropertySelect = (propertyData: PropertyHistory) => {
    setSelectedProperty(propertyData);
  };

  const handleUploadComplete = (data: { applianceType: string; fileName: string }) => {
    console.log('Upload completed:', data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Habitta</h1>
              <p className="text-sm text-muted-foreground">Property Management Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {!selectedProperty ? (
          /* Landing/Search State */
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Find Your Property</h2>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Get comprehensive insights about property history, permits, violations, and maintenance needs.
              </p>
            </div>
            
            <AddressLookup onSelect={handlePropertySelect} />
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full mt-12">
              <Card>
                <CardHeader className="text-center">
                  <Search className="w-8 h-8 mx-auto text-primary mb-2" />
                  <CardTitle>Property Lookup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Search comprehensive property history, sales data, and building details.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="text-center">
                  <Building2 className="w-8 h-8 mx-auto text-primary mb-2" />
                  <CardTitle>Permits & Violations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    View building permits, code violations, and compliance status.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
                  <CardTitle>Maintenance Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Upload and track maintenance photos and appliance service records.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Property Selected State */
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="overview">Property Overview</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
              
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Search New Property
              </button>
            </div>

            <TabsContent value="overview">
              <PropertyDashboard propertyData={selectedProperty} />
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="flex justify-center">
                <MaintenanceUpload onUploadComplete={handleUploadComplete} />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Index;

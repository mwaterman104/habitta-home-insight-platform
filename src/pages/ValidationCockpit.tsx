import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/validation/StatusBadge";
import { ValidationCockpitDB, PropertySample } from "@/lib/validation-cockpit";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Plus, Download, Play, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ImportCsvDialog } from "@/components/validation/ImportCsvDialog";
import { AddAddressDialog } from "@/components/validation/AddAddressDialog";
import { BatchOperationsDialog } from "@/components/validation/BatchOperationsDialog";

export default function ValidationCockpit() {
  const [properties, setProperties] = useState<PropertySample[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await ValidationCockpitDB.getPropertiesSample();
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    if (statusFilter !== "all" && property.status !== statusFilter) return false;
    if (assigneeFilter !== "all" && property.assigned_to !== assigneeFilter) return false;
    return true;
  });

  const statusCounts = {
    pending: properties.filter(p => p.status === 'pending').length,
    enriched: properties.filter(p => p.status === 'enriched').length,
    predicted: properties.filter(p => p.status === 'predicted').length,
    labeled: properties.filter(p => p.status === 'labeled').length,
    scored: properties.filter(p => p.status === 'scored').length,
  };

  const handleEnrichProperty = async (addressId: string) => {
    try {
      const response = await supabase.functions.invoke('enrich-property', {
        body: { address_id: addressId }
      });

      if (response.error) throw new Error(response.error.message);
      
      await ValidationCockpitDB.updatePropertySample(addressId, { status: 'enriched' });
      loadProperties();
      toast.success('Property enriched successfully');
    } catch (error) {
      console.error('Error enriching property:', error);
      toast.error('Failed to enrich property');
    }
  };

  const handlePredictProperty = async (addressId: string) => {
    try {
      const response = await supabase.functions.invoke('predict-property', {
        body: { address_id: addressId }
      });

      if (response.error) throw new Error(response.error.message);
      
      await ValidationCockpitDB.updatePropertySample(addressId, { status: 'predicted' });
      loadProperties();
      toast.success('Predictions generated successfully');
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast.error('Failed to generate predictions');
    }
  };

  const handleExportCsv = () => {
    const csvData = filteredProperties.map(property => ({
      address_id: property.address_id,
      street_address: property.street_address,
      unit: property.unit || '',
      city: property.city,
      state: property.state,
      zip: property.zip,
      apn: property.apn || '',
      source_list: property.source_list || '',
      assigned_to: property.assigned_to || '',
      status: property.status,
      lat: property.lat || '',
      lon: property.lon || '',
      created_at: property.created_at
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `properties_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${csvData.length} properties to CSV`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Habitta Validation Cockpit</h1>
          <p className="text-muted-foreground">
            Manage property data enrichment, predictions, and labeling
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/validation/scoring")}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Scoring Dashboard
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Enriched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.enriched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Predicted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.predicted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Labeled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.labeled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.scored}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <ImportCsvDialog onImportComplete={loadProperties}>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </ImportCsvDialog>
          
          <AddAddressDialog onAddComplete={loadProperties}>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </AddAddressDialog>
          
          <BatchOperationsDialog
            operation="enrich"
            properties={properties}
            onComplete={loadProperties}
          >
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Batch Enrich
            </Button>
          </BatchOperationsDialog>
          
          <BatchOperationsDialog
            operation="predict"
            properties={properties}
            onComplete={loadProperties}
          >
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Batch Predict
            </Button>
          </BatchOperationsDialog>
          
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="enriched">Enriched</SelectItem>
              <SelectItem value="predicted">Predicted</SelectItem>
              <SelectItem value="labeled">Labeled</SelectItem>
              <SelectItem value="scored">Scored</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {/* Add unique assignees dynamically */}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Properties Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Address</th>
                  <th className="text-left p-4 font-medium">City</th>
                  <th className="text-left p-4 font-medium">Zip</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Assigned To</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((property) => (
                  <tr key={property.address_id} className="border-b hover:bg-muted/25">
                    <td className="p-4">
                      <div className="font-medium">{property.street_address}</div>
                      {property.unit && (
                        <div className="text-sm text-muted-foreground">Unit {property.unit}</div>
                      )}
                    </td>
                    <td className="p-4">{property.city}</td>
                    <td className="p-4">{property.zip}</td>
                    <td className="p-4">
                      <StatusBadge status={property.status} />
                    </td>
                    <td className="p-4">
                      {property.assigned_to || (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/validation/label/${property.address_id}`)}
                        >
                          {property.status === 'labeled' ? 'Edit Label' : 'Label'}
                        </Button>
                        {property.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleEnrichProperty(property.address_id)}
                          >
                            Enrich
                          </Button>
                        )}
                        {property.status === 'enriched' && (
                          <Button
                            size="sm"
                            onClick={() => handlePredictProperty(property.address_id)}
                          >
                            Predict
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredProperties.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No properties found. Import some addresses to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
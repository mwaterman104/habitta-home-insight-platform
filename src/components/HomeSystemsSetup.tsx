import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Calendar, Wrench, Clock, Camera } from 'lucide-react';
import { useHomeSystems, type SystemCatalog, type HomeSystem } from '@/hooks/useHomeSystems';
import { useToast } from '@/hooks/use-toast';
import { PhotoCapture } from '@/components/PhotoCapture';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

interface HomeSystemsSetupProps {
  homeId: string;
}

export function HomeSystemsSetup({ homeId }: HomeSystemsSetupProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [editingSystem, setEditingSystem] = useState<any>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  const { systems, catalog, loading, error, addSystem, updateSystem, deleteSystem, analyzePhoto } = useHomeSystems(homeId);
  const { toast } = useToast();

  const handleAddSystem = () => {
    setShowPhotoCapture(true);
  };

  const handlePhotoCapture = async (photo: File) => {
    setIsProcessingPhoto(true);
    try {
      const analysisResult = await analyzePhoto(photo);
      
      if (analysisResult.success) {
        const { analysis } = analysisResult;
        
        // Pre-populate form with AI analysis
        const systemData = {
          system_key: analysis.system_type || 'other',
          brand: analysis.brand,
          model: analysis.model,
          serial: analysis.serial,
          manufacture_year: analysis.manufacture_year,
          capacity_rating: analysis.capacity_rating,
          fuel_type: analysis.fuel_type,
          confidence_scores: analysis.confidence_scores,
          data_sources: ['vision']
        };

        // If confidence is high enough, create system automatically
        const confidenceValues = Object.values(analysis.confidence_scores || {}).filter(val => typeof val === 'number') as number[];
        const avgConfidence = confidenceValues.length > 0 ? 
          confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : 0;
        
        if (avgConfidence >= 0.7) {
          await addSystem(systemData);
          toast({
            title: "System Added Successfully",
            description: `${analysis.brand || 'Device'} ${analysis.model || ''} detected with ${Math.round(avgConfidence * 100)}% confidence.`
          });
        } else {
          // Show form with pre-populated data for user review
          setEditingSystem(systemData);
          setIsAddDialogOpen(true);
        }
      } else {
        throw new Error(analysisResult.error);
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the photo. Please try again or add manually.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPhoto(false);
      setShowPhotoCapture(false);
    }
  };

  const handleEditSystem = (system: HomeSystem) => {
    setEditingSystem(system);
    setIsEditDialogOpen(true);
  };

  const handleDeleteSystem = async (systemId: string) => {
    try {
      await deleteSystem(systemId);
      toast({
        title: "System deleted",
        description: "The system has been removed from your home."
      });
    } catch (error) {
      toast({
        title: "Error deleting system",
        description: "There was an error deleting your system. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading systems...</div>;
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {systems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No systems added yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Add your home's major systems to get AI-powered lifecycle predictions and maintenance recommendations.
            </p>
          <div className="space-y-2">
            <Button onClick={handleAddSystem} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Take Photo to Add System
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              variant="outline" 
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Home Systems</h2>
          <div className="flex gap-2">
            <Button onClick={handleAddSystem}>
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => {
            const catalogSystem = catalog.find(c => c.key === system.system_key);
            const age = system.install_date ? 
              new Date().getFullYear() - new Date(system.install_date).getFullYear() : null;
            const remainingYears = catalogSystem && age ? 
              Math.max(0, catalogSystem.typical_lifespan_years - age) : null;

            return (
              <Card key={system.id}>
                <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {system.brand} {system.model} 
                  </h3>
                  <Badge variant="secondary">
                    {catalogSystem?.display_name || system.system_key}
                  </Badge>
                  {system.confidence_scores && Object.keys(system.confidence_scores).length > 0 && (
                    <ConfidenceBadge 
                      confidence={(() => {
                        const values = Object.values(system.confidence_scores || {}).filter(val => typeof val === 'number') as number[];
                        return values.length > 0 ? 
                          values.reduce((a, b) => a + b, 0) / values.length : 0;
                      })()}
                      source={system.data_sources?.[0] || 'manual'}
                    />
                  )}
                </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSystem(system)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSystem(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {system.serial && (
                    <CardDescription>Serial: {system.serial}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {age && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {age} years old
                      </Badge>
                    )}
                    {remainingYears !== null && (
                      <Badge 
                        variant={remainingYears < 3 ? "destructive" : 
                               remainingYears < 7 ? "secondary" : "default"}
                      >
                        {remainingYears}yr remaining
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {system.install_date && (
                      <div>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Installed: {new Date(system.install_date).toLocaleDateString()}
                      </div>
                    )}
                    {system.last_service_date && (
                      <div>
                        <Wrench className="h-3 w-3 inline mr-1" />
                        Last service: {new Date(system.last_service_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </>
      )}

      {showPhotoCapture && (
        <Dialog open={showPhotoCapture} onOpenChange={setShowPhotoCapture}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add System with Photo</DialogTitle>
            </DialogHeader>
            <PhotoCapture
              onPhotoCapture={handlePhotoCapture}
              onCancel={() => setShowPhotoCapture(false)}
              isProcessing={isProcessingPhoto}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New System</DialogTitle>
          </DialogHeader>
          <SystemForm
            catalog={catalog}
            initialData={editingSystem}
            onSave={(data) => {
              addSystem(data).then(() => {
                setIsAddDialogOpen(false);
                setEditingSystem(null);
                toast({
                  title: "System added successfully",
                  description: "Your home system has been added to the database."
                });
              }).catch(() => {
                toast({
                  title: "Error adding system",
                  description: "There was an error adding your system. Please try again.",
                  variant: "destructive"
                });
              });
            }}
            onCancel={() => {
              setIsAddDialogOpen(false);
              setEditingSystem(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {isEditDialogOpen && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit System</DialogTitle>
            </DialogHeader>
            <SystemForm
              catalog={catalog}
              initialData={editingSystem}
              onSave={(data) => {
                updateSystem(editingSystem.id, data).then(() => {
                  setIsEditDialogOpen(false);
                  setEditingSystem(null);
                  toast({
                    title: "System updated successfully",
                    description: "Your system details have been updated."
                  });
                }).catch(() => {
                  toast({
                    title: "Error updating system",
                    description: "There was an error updating your system. Please try again.",
                    variant: "destructive"
                  });
                });
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingSystem(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface SystemFormProps {
  catalog: SystemCatalog[];
  initialData?: Partial<HomeSystem>;
  onSave: (data: Partial<HomeSystem>) => void;
  onCancel: () => void;
}

function SystemForm({ catalog, initialData, onSave, onCancel }: SystemFormProps) {
  const [formData, setFormData] = useState({
    system_key: initialData?.system_key || '',
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    serial: initialData?.serial || '',
    install_date: initialData?.install_date || '',
    last_service_date: initialData?.last_service_date || '',
    manufacture_year: initialData?.manufacture_year || '',
    capacity_rating: initialData?.capacity_rating || '',
    fuel_type: initialData?.fuel_type || '',
    location_detail: initialData?.location_detail || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      manufacture_year: formData.manufacture_year ? parseInt(formData.manufacture_year.toString()) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="system_key">System Type *</Label>
        <Select
          value={formData.system_key}
          onValueChange={(value) => setFormData(prev => ({ ...prev, system_key: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select system type" />
          </SelectTrigger>
          <SelectContent>
            {catalog.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            placeholder="e.g. Trane, Carrier"
          />
        </div>
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
            placeholder="Model number"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="serial">Serial Number</Label>
        <Input
          id="serial"
          value={formData.serial}
          onChange={(e) => setFormData(prev => ({ ...prev, serial: e.target.value }))}
          placeholder="Serial number"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="install_date">Install Date</Label>
          <Input
            id="install_date"
            type="date"
            value={formData.install_date}
            onChange={(e) => setFormData(prev => ({ ...prev, install_date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="last_service_date">Last Service Date</Label>
          <Input
            id="last_service_date"
            type="date"
            value={formData.last_service_date}
            onChange={(e) => setFormData(prev => ({ ...prev, last_service_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="capacity_rating">Capacity</Label>
          <Input
            id="capacity_rating"
            value={formData.capacity_rating}
            onChange={(e) => setFormData(prev => ({ ...prev, capacity_rating: e.target.value }))}
            placeholder="e.g. 3 tons, 40 gal, 200 amp"
          />
        </div>
        <div>
          <Label htmlFor="fuel_type">Fuel Type</Label>
          <Select
            value={formData.fuel_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electric">Electric</SelectItem>
              <SelectItem value="gas">Natural Gas</SelectItem>
              <SelectItem value="propane">Propane</SelectItem>
              <SelectItem value="heat_pump">Heat Pump</SelectItem>
              <SelectItem value="solar">Solar</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="location_detail">Location</Label>
        <Input
          id="location_detail"
          value={formData.location_detail}
          onChange={(e) => setFormData(prev => ({ ...prev, location_detail: e.target.value }))}
          placeholder="e.g. Basement, Attic, Garage"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes or details"
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={!formData.system_key}>
          Save System
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
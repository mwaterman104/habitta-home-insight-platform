import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Settings, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useHomeSystems, type SystemCatalog, type HomeSystem } from "@/hooks/useHomeSystems";
import { useToast } from "@/hooks/use-toast";

interface HomeSystemsSetupProps {
  homeId: string;
}

export function HomeSystemsSetup({ homeId }: HomeSystemsSetupProps) {
  const { systems, catalog, loading, addSystem, updateSystem, deleteSystem } = useHomeSystems(homeId);
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<HomeSystem | null>(null);

  const getSystemCatalog = (systemKey: string): SystemCatalog | undefined => {
    return catalog.find(c => c.key === systemKey);
  };

  const getInstallDateHeuristic = (systemKey: string, homeYearBuilt?: number): Date => {
    const currentYear = new Date().getFullYear();
    const fallbackYear = homeYearBuilt || currentYear - 10;
    
    switch (systemKey) {
      case 'hvac':
        return new Date(Math.max(fallbackYear, currentYear - 12), 6, 1);
      case 'water_heater':
        return new Date(currentYear - 10, 0, 1);
      case 'roof':
        return new Date(fallbackYear, 0, 1);
      case 'windows':
        return new Date(fallbackYear, 0, 1);
      case 'flooring':
        return new Date(fallbackYear + 2, 0, 1);
      default:
        return new Date(fallbackYear, 0, 1);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading systems...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Home Systems</h2>
          <p className="text-muted-foreground">Manage your home's major systems to get AI-powered predictions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add System
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Home System</DialogTitle>
              <DialogDescription>
                Add a system to start getting lifecycle predictions and maintenance recommendations.
              </DialogDescription>
            </DialogHeader>
            <SystemForm
              catalog={catalog}
              onSave={async (data) => {
                try {
                  await addSystem(data);
                  setIsAddDialogOpen(false);
                  toast({
                    title: "System added",
                    description: "Your system has been added successfully.",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to add system. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {systems.map((system) => {
          const catalogInfo = getSystemCatalog(system.system_key);
          const installDate = system.install_date ? new Date(system.install_date) : null;
          const age = installDate ? new Date().getFullYear() - installDate.getFullYear() : null;
          const remainingYears = catalogInfo && age ? Math.max(0, catalogInfo.typical_lifespan_years - age) : null;

          return (
            <Card key={system.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{catalogInfo?.display_name || system.system_key}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingSystem(system)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deleteSystem(system.id);
                          toast({
                            title: "System removed",
                            description: "The system has been removed.",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to remove system.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {system.brand && (
                  <CardDescription>{system.brand} {system.model}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {age !== null && (
                    <Badge variant="outline">{age} years old</Badge>
                  )}
                  {remainingYears !== null && (
                    <Badge variant={remainingYears < 3 ? "destructive" : remainingYears < 7 ? "secondary" : "default"}>
                      {remainingYears}yr left
                    </Badge>
                  )}
                </div>
                
                {installDate && (
                  <div className="text-sm text-muted-foreground">
                    Installed: {format(installDate, "MMM yyyy")}
                  </div>
                )}
                
                {system.last_service_date && (
                  <div className="text-sm text-muted-foreground">
                    Last service: {format(new Date(system.last_service_date), "MMM yyyy")}
                  </div>
                )}

                {catalogInfo?.cost_low && catalogInfo?.cost_high && (
                  <div className="text-sm text-muted-foreground">
                    Replacement: ${catalogInfo.cost_low.toLocaleString()} - ${catalogInfo.cost_high.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {systems.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No systems added yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your home's major systems to get AI-powered lifecycle predictions and maintenance recommendations.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First System
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {editingSystem && (
        <Dialog open={!!editingSystem} onOpenChange={() => setEditingSystem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit System</DialogTitle>
              <DialogDescription>
                Update system details to improve prediction accuracy.
              </DialogDescription>
            </DialogHeader>
            <SystemForm
              catalog={catalog}
              initialData={editingSystem}
              onSave={async (data) => {
                try {
                  await updateSystem(editingSystem.id, data);
                  setEditingSystem(null);
                  toast({
                    title: "System updated",
                    description: "System details have been updated.",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to update system.",
                    variant: "destructive",
                  });
                }
              }}
              onCancel={() => setEditingSystem(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface SystemFormProps {
  catalog: SystemCatalog[];
  initialData?: HomeSystem;
  onSave: (data: Partial<HomeSystem>) => void;
  onCancel: () => void;
}

function SystemForm({ catalog, initialData, onSave, onCancel }: SystemFormProps) {
  const [formData, setFormData] = useState({
    system_key: initialData?.system_key || "",
    brand: initialData?.brand || "",
    model: initialData?.model || "",
    install_date: initialData?.install_date || "",
    last_service_date: initialData?.last_service_date || "",
    notes: initialData?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="system_key">System Type</Label>
        <Select
          value={formData.system_key}
          onValueChange={(value) => setFormData(prev => ({ ...prev, system_key: value }))}
          disabled={!!initialData}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Install Date</Label>
          <Input
            type="date"
            value={formData.install_date}
            onChange={(e) => setFormData(prev => ({ ...prev, install_date: e.target.value }))}
          />
        </div>
        <div>
          <Label>Last Service Date</Label>
          <Input
            type="date"
            value={formData.last_service_date}
            onChange={(e) => setFormData(prev => ({ ...prev, last_service_date: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes or details"
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
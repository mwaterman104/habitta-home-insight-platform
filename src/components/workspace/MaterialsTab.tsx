import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Package, DollarSign, ExternalLink, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimated_cost?: number;
  actual_cost?: number;
  supplier_name?: string;
  supplier_url?: string;
  is_purchased: boolean;
  notes?: string;
}

interface MaterialsTabProps {
  projectId: string;
  onDataChange: () => void;
}

const MaterialsTab: React.FC<MaterialsTabProps> = ({ projectId, onDataChange }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCosts, setEditingCosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMaterials();
  }, [projectId]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePurchased = async (materialId: string, purchased: boolean) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ is_purchased: purchased })
        .eq('id', materialId);

      if (error) throw error;

      setMaterials(prev => prev.map(material =>
        material.id === materialId ? { ...material, is_purchased: purchased } : material
      ));

      onDataChange();
    } catch (error) {
      console.error('Error updating material:', error);
    }
  };

  const updateActualCost = async (materialId: string, actualCost: number) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ actual_cost: actualCost })
        .eq('id', materialId);

      if (error) throw error;

      setMaterials(prev => prev.map(material =>
        material.id === materialId ? { ...material, actual_cost: actualCost } : material
      ));

      setEditingCosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });

      onDataChange();
    } catch (error) {
      console.error('Error updating cost:', error);
    }
  };

  const getTotalCosts = () => {
    const estimated = materials.reduce((sum, material) => 
      sum + ((material.estimated_cost || 0) * material.quantity), 0
    );
    const actual = materials.reduce((sum, material) => 
      sum + ((material.actual_cost || 0) * material.quantity), 0
    );
    return { estimated, actual };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const purchasedCount = materials.filter(m => m.is_purchased).length;
  const totalCount = materials.length;
  const { estimated, actual } = getTotalCosts();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Materials List</h3>
          <p className="text-sm text-muted-foreground">
            Track materials needed and purchased for your project
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Material
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Materials</p>
              <p className="font-semibold">{purchasedCount}/{totalCount} Purchased</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              <p className="font-semibold">{formatCurrency(estimated)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actual Cost</p>
              <p className="font-semibold">{formatCurrency(actual)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">No materials yet</h3>
              <p className="text-sm text-muted-foreground">
                Add materials to track what you need for your project
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {materials.map(material => (
                <div
                  key={material.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={material.is_purchased}
                    onCheckedChange={(checked) => 
                      togglePurchased(material.id, checked as boolean)
                    }
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${
                        material.is_purchased ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {material.name}
                      </h4>
                      {material.is_purchased && (
                        <Badge variant="secondary" className="text-xs">
                          Purchased
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Qty: {material.quantity} {material.unit}</span>
                      {material.estimated_cost && (
                        <span>Est: {formatCurrency(material.estimated_cost * material.quantity)}</span>
                      )}
                      {material.supplier_name && (
                        <span>Supplier: {material.supplier_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingCosts.has(material.id) ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-20 h-8"
                          defaultValue={material.actual_cost || ''}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateActualCost(material.id, value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseFloat(e.currentTarget.value) || 0;
                              updateActualCost(material.id, value);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCosts(prev => new Set(prev).add(material.id))}
                        className="text-xs"
                      >
                        {material.actual_cost 
                          ? formatCurrency(material.actual_cost * material.quantity)
                          : 'Add cost'
                        }
                      </Button>
                    )}

                    {material.supplier_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={material.supplier_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MaterialsTab;
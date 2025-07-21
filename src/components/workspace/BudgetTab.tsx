import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BudgetCategory {
  id: string;
  category: string;
  estimated_amount: number;
  actual_amount: number;
}

interface BudgetTabProps {
  projectId: string;
  onDataChange: () => void;
}

const BudgetTab: React.FC<BudgetTabProps> = ({ projectId, onDataChange }) => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [materialsCost, setMaterialsCost] = useState({ estimated: 0, actual: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  const fetchBudgetData = async () => {
    try {
      // Fetch budget categories
      const { data: budgetData, error: budgetError } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .order('category');

      if (budgetError) throw budgetError;

      // Fetch materials costs
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('estimated_cost, actual_cost, quantity')
        .eq('project_id', projectId);

      if (materialsError) throw materialsError;

      const estimatedMaterials = (materialsData || []).reduce((sum, material) => 
        sum + ((material.estimated_cost || 0) * material.quantity), 0
      );
      const actualMaterials = (materialsData || []).reduce((sum, material) => 
        sum + ((material.actual_cost || 0) * material.quantity), 0
      );

      setBudgetCategories(budgetData || []);
      setMaterialsCost({ estimated: estimatedMaterials, actual: actualMaterials });
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalBudget = () => {
    const estimated = budgetCategories.reduce((sum, cat) => sum + cat.estimated_amount, 0) + materialsCost.estimated;
    const actual = budgetCategories.reduce((sum, cat) => sum + cat.actual_amount, 0) + materialsCost.actual;
    return { estimated, actual };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceInfo = (estimated: number, actual: number) => {
    const variance = actual - estimated;
    const percentage = estimated > 0 ? Math.abs(variance / estimated) * 100 : 0;
    
    return {
      amount: variance,
      percentage,
      isOverBudget: variance > 0,
      isSignificant: percentage > 10
    };
  };

  const getCategoryProgress = (category: BudgetCategory) => {
    if (category.estimated_amount === 0) return 0;
    return Math.min((category.actual_amount / category.estimated_amount) * 100, 100);
  };

  const { estimated: totalEstimated, actual: totalActual } = getTotalBudget();
  const totalVariance = getVarianceInfo(totalEstimated, totalActual);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted rounded"></div>
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
          <h3 className="text-lg font-semibold">Project Budget</h3>
          <p className="text-sm text-muted-foreground">
            Track estimated vs actual costs across categories
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="font-semibold">{formatCurrency(totalEstimated)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="font-semibold">{formatCurrency(totalActual)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              totalVariance.isOverBudget ? 'bg-destructive/10' : 'bg-success/10'
            }`}>
              {totalVariance.isOverBudget ? (
                <TrendingUp className="w-5 h-5 text-destructive" />
              ) : (
                <TrendingDown className="w-5 h-5 text-success" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Variance</p>
              <p className={`font-semibold ${
                totalVariance.isOverBudget ? 'text-destructive' : 'text-success'
              }`}>
                {totalVariance.isOverBudget ? '+' : ''}{formatCurrency(totalVariance.amount)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <div className="space-y-4">
        <h4 className="font-semibold">Budget Categories</h4>
        
        {/* Materials Category (from materials table) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h4 className="font-medium">Materials</h4>
                <Badge variant="outline">Auto-calculated</Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(materialsCost.actual)} / {formatCurrency(materialsCost.estimated)}
                </p>
              </div>
            </div>
            <Progress 
              value={materialsCost.estimated > 0 ? (materialsCost.actual / materialsCost.estimated) * 100 : 0} 
              className="h-2 mb-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>From materials list</span>
              <span>
                {materialsCost.estimated > 0 
                  ? Math.round((materialsCost.actual / materialsCost.estimated) * 100)
                  : 0}% spent
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Manual Budget Categories */}
        {budgetCategories.map(category => {
          const progress = getCategoryProgress(category);
          const variance = getVarianceInfo(category.estimated_amount, category.actual_amount);

          return (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{category.category}</h4>
                    {variance.isSignificant && (
                      <Badge variant={variance.isOverBudget ? "destructive" : "secondary"}>
                        {variance.isOverBudget ? "Over budget" : "Under budget"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(category.actual_amount)} / {formatCurrency(category.estimated_amount)}
                    </p>
                    {variance.isSignificant && (
                      <p className={`text-xs ${
                        variance.isOverBudget ? 'text-destructive' : 'text-success'
                      }`}>
                        {variance.isOverBudget ? '+' : '-'}{formatCurrency(Math.abs(variance.amount))}
                      </p>
                    )}
                  </div>
                </div>
                <Progress value={progress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Budget allocation</span>
                  <span>{Math.round(progress)}% spent</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {budgetCategories.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">No budget categories yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add budget categories like Labor, Tools, or Permits to track spending
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Budget Alerts */}
      {totalVariance.isOverBudget && totalVariance.isSignificant && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Budget Alert</p>
              <p className="text-sm text-muted-foreground">
                You're {formatCurrency(totalVariance.amount)} over budget ({Math.round(totalVariance.percentage)}% over)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetTab;
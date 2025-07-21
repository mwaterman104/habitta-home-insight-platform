import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ProjectTemplate {
  id: string;
  name: string;
  room_type: string;
  description?: string;
  default_phases: any[];
  default_materials: any[];
  estimated_budget_range: { min: number; max: number };
}

const TemplateSelection = () => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates((data || []) as unknown as ProjectTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProjectFromTemplate = async (template: ProjectTemplate) => {
    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: `${template.name} Project`,
          room_type: template.room_type,
          description: template.description,
          template_id: template.id,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project phases
      if (template.default_phases && template.default_phases.length > 0) {
        const phases = template.default_phases.map((phase: any) => ({
          project_id: project.id,
          name: phase.name,
          description: phase.description,
          order_index: phase.order_index
        }));

        const { error: phasesError } = await supabase
          .from('project_phases')
          .insert(phases);

        if (phasesError) throw phasesError;
      }

      // Create default materials
      if (template.default_materials && template.default_materials.length > 0) {
        const materials = template.default_materials.map((material: any) => ({
          project_id: project.id,
          name: material.name,
          quantity: material.quantity,
          unit: material.unit,
          estimated_cost: material.estimated_cost
        }));

        const { error: materialsError } = await supabase
          .from('materials')
          .insert(materials);

        if (materialsError) throw materialsError;
      }

      // Create default budget categories
      const budgetCategories = [
        { category: 'Materials', estimated_amount: template.estimated_budget_range.min * 0.6 },
        { category: 'Labor', estimated_amount: template.estimated_budget_range.min * 0.3 },
        { category: 'Tools & Equipment', estimated_amount: template.estimated_budget_range.min * 0.1 }
      ];

      const budgets = budgetCategories.map(budget => ({
        project_id: project.id,
        ...budget
      }));

      const { error: budgetError } = await supabase
        .from('project_budgets')
        .insert(budgets);

      if (budgetError) throw budgetError;

      // Navigate to the new project
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project from template:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold">Choose a Template</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Choose a Template</h2>
          <p className="text-muted-foreground">
            Start with a pre-built template to get your project organized quickly
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <Badge variant="secondary">{template.room_type}</Badge>
                </div>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{template.default_phases?.length || 0} phases</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{template.default_materials?.length || 0} materials</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-success" />
                <span>
                  {formatCurrency(template.estimated_budget_range.min)} - {formatCurrency(template.estimated_budget_range.max)}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Includes:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {template.default_phases?.slice(0, 3).map((phase: any, index: number) => (
                    <li key={index}>• {phase.name}</li>
                  ))}
                  {template.default_phases?.length > 3 && (
                    <li>• And {template.default_phases.length - 3} more phases...</li>
                  )}
                </ul>
              </div>

              <Button 
                className="w-full" 
                onClick={() => createProjectFromTemplate(template)}
              >
                Start This Project
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelection;
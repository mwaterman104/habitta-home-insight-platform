
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  description TEXT,
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project templates table
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  description TEXT,
  default_phases JSONB,
  default_materials JSONB,
  estimated_budget_range JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project phases table
CREATE TABLE public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create materials table
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'each',
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  supplier_name TEXT,
  supplier_url TEXT,
  is_purchased BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project budgets table
CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  estimated_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project timelines table
CREATE TABLE public.project_timelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  milestone_name TEXT NOT NULL,
  target_date DATE,
  actual_date DATE,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_timelines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project templates (public read)
CREATE POLICY "Anyone can view project templates" ON public.project_templates FOR SELECT USING (true);

-- RLS Policies for project phases
CREATE POLICY "Users can view phases of their projects" ON public.project_phases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create phases for their projects" ON public.project_phases FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update phases of their projects" ON public.project_phases FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete phases of their projects" ON public.project_phases FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks of their projects" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create tasks for their projects" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update tasks of their projects" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete tasks of their projects" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- RLS Policies for materials
CREATE POLICY "Users can view materials of their projects" ON public.materials FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create materials for their projects" ON public.materials FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update materials of their projects" ON public.materials FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete materials of their projects" ON public.materials FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- RLS Policies for project budgets
CREATE POLICY "Users can view budgets of their projects" ON public.project_budgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create budgets for their projects" ON public.project_budgets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update budgets of their projects" ON public.project_budgets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete budgets of their projects" ON public.project_budgets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- RLS Policies for chat sessions
CREATE POLICY "Users can view chat sessions of their projects" ON public.chat_sessions FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can create chat sessions for their projects" ON public.chat_sessions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update their chat sessions" ON public.chat_sessions FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can delete their chat sessions" ON public.chat_sessions FOR DELETE USING (
  auth.uid() = user_id
);

-- RLS Policies for project timelines
CREATE POLICY "Users can view timelines of their projects" ON public.project_timelines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create timelines for their projects" ON public.project_timelines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update timelines of their projects" ON public.project_timelines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete timelines of their projects" ON public.project_timelines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- Insert default project templates
INSERT INTO public.project_templates (name, room_type, description, default_phases, default_materials, estimated_budget_range) VALUES
(
  'Deck Build',
  'Outdoor',
  'Complete deck construction project with all phases',
  '[
    {"name": "Planning & Design", "description": "Plan deck design, get permits, and order materials", "order_index": 1},
    {"name": "Foundation", "description": "Dig footings, set posts, and pour concrete", "order_index": 2},
    {"name": "Frame & Structure", "description": "Build frame, install joists, and add structural elements", "order_index": 3},
    {"name": "Decking & Finish", "description": "Install decking boards, railings, and apply finish", "order_index": 4}
  ]',
  '[
    {"name": "Pressure-treated lumber 2x10x12", "quantity": 10, "unit": "boards", "estimated_cost": 35.00},
    {"name": "Deck boards 5/4x6x12", "quantity": 25, "unit": "boards", "estimated_cost": 45.00},
    {"name": "Concrete mix", "quantity": 20, "unit": "bags", "estimated_cost": 8.00},
    {"name": "Galvanized deck screws", "quantity": 5, "unit": "lbs", "estimated_cost": 25.00},
    {"name": "Post anchors", "quantity": 8, "unit": "each", "estimated_cost": 15.00}
  ]',
  '{"min": 2000, "max": 8000}'
),
(
  'Kitchen Remodel',
  'Kitchen',
  'Complete kitchen renovation including cabinets, countertops, and appliances',
  '[
    {"name": "Planning & Design", "description": "Design layout, select materials, and get permits", "order_index": 1},
    {"name": "Demolition", "description": "Remove old cabinets, countertops, and flooring", "order_index": 2},
    {"name": "Plumbing & Electrical", "description": "Update plumbing and electrical systems", "order_index": 3},
    {"name": "Installation", "description": "Install cabinets, countertops, and appliances", "order_index": 4},
    {"name": "Finishing", "description": "Paint, install trim, and final touches", "order_index": 5}
  ]',
  '[
    {"name": "Kitchen cabinets", "quantity": 1, "unit": "set", "estimated_cost": 5000.00},
    {"name": "Quartz countertops", "quantity": 25, "unit": "sq ft", "estimated_cost": 80.00},
    {"name": "Tile flooring", "quantity": 100, "unit": "sq ft", "estimated_cost": 6.00},
    {"name": "Kitchen sink", "quantity": 1, "unit": "each", "estimated_cost": 300.00},
    {"name": "Refrigerator", "quantity": 1, "unit": "each", "estimated_cost": 1200.00}
  ]',
  '{"min": 15000, "max": 50000}'
);

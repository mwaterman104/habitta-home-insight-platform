import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { addTask } from "../utils/tasksMock";
import { Task } from "../types/habitta";
import { Plus, ArrowLeft } from "lucide-react";

export default function TasksNew() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    due_date: "",
    labels: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.due_date) newErrors.due_date = "Due date is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create new task
    const task: Task = {
      id: `task-${Date.now()}`,
      title: formData.title.trim(),
      due_date: formData.due_date,
      category: "User Created",
      priority: "medium",
      labels: formData.labels.split(",").map(l => l.trim()).filter(Boolean),
      status: "pending",
    };

    addTask(task);
    navigate("/");
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Create New Task</h1>
        <p className="text-muted-foreground mt-1">
          Add a custom maintenance task to your timeline
        </p>
      </div>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Task Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Clean air vents"
                />
                {errors.title && (
                  <p className="text-destructive text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange("due_date", e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errors.due_date && (
                  <p className="text-destructive text-sm mt-1">{errors.due_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Labels (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.labels}
                  onChange={(e) => handleChange("labels", e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., routine, hvac, seasonal"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  Create Task
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAllTasks } from "../hooks/useHabittaLocal";
import { useDIYGuides } from "../../src/hooks/useSeasonalData";
import { ArrowLeft, AlertTriangle, Wrench, Package, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function ChatDIY() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = searchParams.get("taskId");
  
  const allTasks = useAllTasks();
  const { guides, loading: guidesLoading } = useDIYGuides();

  if (guidesLoading) return <div>Loading...</div>;
  
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const selectedTask = taskId ? allTasks.find(task => task.id === taskId) : null;
  
  // Find matching guide
  const matchingGuide = selectedTask ? guides.find(guide => {
    // Match by category
    if (guide.match.category && selectedTask.category.toLowerCase().includes(guide.match.category.toLowerCase())) {
      return true;
    }
    // Match by labels
    if (guide.match.labels && selectedTask.labels) {
      return guide.match.labels.some(label => 
        selectedTask.labels?.some(taskLabel => 
          taskLabel.toLowerCase().includes(label.toLowerCase())
        )
      );
    }
    return false;
  }) : null;

  // If no specific task, check for topic fallback
  const [searchParams2] = useSearchParams();
  const topic = searchParams2.get("topic");
  const topicGuide = topic ? guides.find(guide => 
    guide.topic.toLowerCase() === topic.toLowerCase()
  ) : null;

  const toggleStep = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);
  };

  // If no taskId, show available guides
  if (!taskId || !selectedTask) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mb-4 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">ChatDIY Guides</h1>
          <p className="text-muted-foreground mt-1">
            Step-by-step maintenance guides for your home
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map((guide) => (
            <Card key={guide.id} className="rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{guide.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <strong>Topic:</strong> {guide.topic}
                  </div>
                  <div className="text-sm">
                    <strong>Steps:</strong> {guide.steps.length}
                  </div>
                  <div className="text-sm">
                    <strong>Tools:</strong> {guide.tools.length} required
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Use matching guide or topic guide
  const activeGuide = matchingGuide || topicGuide;

  // If no matching guide found
  if (!activeGuide) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-4 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <Card className="rounded-2xl max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Guide Not Available</h2>
            <p className="text-muted-foreground">
              We don't have a specific guide for "{selectedTask.title}" yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Consider consulting a professional for this task.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionRate = (completedSteps.size / activeGuide.steps.length) * 100;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate("/")}
        className="mb-4 rounded-xl"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{activeGuide.title}</h1>
        <p className="text-muted-foreground mt-1">
          {selectedTask ? `Step-by-step guide for: ${selectedTask.title}` : `${activeGuide.topic} maintenance guide`}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Guide Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Safety Warnings */}
          {activeGuide.safety.length > 0 && (
            <Card className="rounded-2xl border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Safety First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {activeGuide.safety.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Steps */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Steps ({completedSteps.size} of {activeGuide.steps.length})
                </span>
                <span className="text-sm text-muted-foreground">
                  {completionRate.toFixed(0)}% Complete
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              
              {activeGuide.steps.map((step, index) => {
                const isCompleted = completedSteps.has(index);
                return (
                  <div
                    key={index}
                    className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      isCompleted ? 'bg-green-50' : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => toggleStep(index)}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCompleted 
                        ? 'bg-green-600 border-green-600' 
                        : 'border-muted-foreground'
                    }`}>
                      {isCompleted && <CheckCircle className="h-4 w-4 text-white" />}
                      {!isCompleted && <span className="text-xs text-muted-foreground">{index + 1}</span>}
                    </div>
                    <span className={`${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tools Required */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5" />
                Tools Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {activeGuide.tools.map((tool, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    {tool}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Parts/Materials */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Parts & Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {activeGuide.parts.map((part, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    {part}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
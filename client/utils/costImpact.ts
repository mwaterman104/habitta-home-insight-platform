import { Task } from "../types/habitta";

export const getCostImpact = (task: Task): "Low" | "Medium" | "High" => {
  const cost = task.cost || 0;
  const priority = task.priority;
  
  // High priority tasks or expensive tasks get High impact
  if (priority === "high" || cost > 200) return "High";
  
  // Medium priority or moderate cost tasks get Medium impact
  if (priority === "medium" || cost > 100) return "Medium";
  
  // Everything else is Low impact
  return "Low";
};
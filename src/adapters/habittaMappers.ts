import { Alert, SystemHealthStatus } from "../../client/types/alerts";
import { Task } from "../../client/types/habitta";

// Map Supabase maintenance_tasks to client Task format
export const mapMaintenanceTaskToTask = (task: any): Task => {
  return {
    id: task.id,
    title: task.title || task.description || 'Maintenance Task',
    due_date: task.due_date,
    category: task.category || 'General',
    priority: task.priority || 'medium',
    cost: task.cost,
    labels: [], // Could be derived from category or other fields
    status: task.status || 'pending'
  };
};

// Map tasks to alerts for the TodaysPriorities component
export const mapTasksToAlerts = (tasks: Task[]): Alert[] => {
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  return tasks
    .filter(task => {
      const dueDate = new Date(task.due_date);
      return dueDate <= threeDaysFromNow && task.status === 'pending';
    })
    .map(task => {
      const dueDate = new Date(task.due_date);
      const isOverdue = dueDate < now;
      const isToday = dueDate.toDateString() === now.toDateString();
      
      let severity: "low" | "medium" | "high" = "medium";
      let score = 50;
      if (isOverdue || task.priority === 'high') {
        severity = "high";
        score = 80;
      } else if (isToday || task.priority === 'medium') {
        severity = "medium";
        score = 60;
      } else {
        severity = "low";
        score = 30;
      }

      return {
        id: task.id,
        title: task.title,
        severity,
        score,
        consequence: isOverdue ? 'System degradation' : 'Preventive maintenance',
        deadline: task.due_date,
        cost: task.cost,
        system: mapCategoryToSystem(task.category) as any,
        actions: [
          {
            type: "diy" as const,
            label: "DIY Guide",
            duration: "30-60 min"
          }
        ],
        source: "maintenance" as const
      };
    })
    .sort((a, b) => {
      // Sort by severity first (high > medium > low), then by due date
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime();
    });
};

// Map category to system for system health tracking  
export const mapCategoryToSystem = (category: string): "hvac" | "water" | "roof" | "electrical" | "plumbing" | "appliances" => {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('hvac') || categoryLower.includes('heating') || categoryLower.includes('cooling')) {
    return 'hvac';
  } else if (categoryLower.includes('water')) {
    return 'water';
  } else if (categoryLower.includes('roof') || categoryLower.includes('exterior')) {
    return 'roof';
  } else if (categoryLower.includes('electrical') || categoryLower.includes('electric')) {
    return 'electrical';
  } else if (categoryLower.includes('appliance') || categoryLower.includes('kitchen')) {
    return 'appliances';
  } else if (categoryLower.includes('plumbing') || categoryLower.includes('bathroom')) {
    return 'plumbing';
  }
  
  return 'hvac'; // Default fallback to hvac
};

// Generate system health status from alerts and tasks
export const generateSystemHealthFromTasks = (tasks: Task[]): SystemHealthStatus[] => {
  const systems: ("hvac" | "water" | "roof" | "electrical" | "plumbing" | "appliances")[] = 
    ['hvac', 'water', 'roof', 'electrical', 'plumbing', 'appliances'];
  
  return systems.map(system => {
    // Find tasks related to this system
    const systemTasks = tasks.filter(task => mapCategoryToSystem(task.category) === system);
    const overdueTasks = systemTasks.filter(task => {
      const dueDate = new Date(task.due_date);
      return dueDate < new Date() && task.status === 'pending';
    });
    const upcomingTasks = systemTasks.filter(task => {
      const dueDate = new Date(task.due_date);
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      return dueDate >= now && dueDate <= thirtyDaysFromNow && task.status === 'pending';
    });
    
    let status: "green" | "yellow" | "red" = "green";
    let nextService: string | undefined;
    
    if (overdueTasks.length > 0) {
      status = "red";
      nextService = `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`;
    } else if (upcomingTasks.length > 0) {
      status = "yellow";
      const nextTask = upcomingTasks.sort((a, b) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
      nextService = `Due ${new Date(nextTask.due_date).toLocaleDateString()}`;
    } else {
      nextService = "System healthy";
    }
    
    return {
      system,
      status,
      label: system.charAt(0).toUpperCase() + system.slice(1),
      nextService
    };
  });
};

// Map home data to property summary format
export const mapHomeToPropertySummary = (home: any) => {
  return {
    address: `${home.address}, ${home.city}, ${home.state} ${home.zip_code}`,
    homeValue: 450000, // This would come from property API or valuations table
    yearOverYearChange: 5.2, // This would be calculated from historical data
    maintenanceCompletionRate: 85, // This would be calculated from tasks
    preventiveMaintenanceScore: 92, // This would be calculated from system health
    metrics: {
      condition_score: 85,
      safety_compliance: 90,
      energy_efficiency: 78
    }
  };
};
import { Badge } from "./ui/badge";
import { SystemHealthStatus } from "../types/alerts";

interface SystemHealthStripProps {
  systems: SystemHealthStatus[];
}

export default function SystemHealthStrip({ systems }: SystemHealthStripProps) {
  const getStatusColor = (status: SystemHealthStatus['status']) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIcon = (status: SystemHealthStatus['status']) => {
    switch (status) {
      case 'green': return '●';
      case 'yellow': return '●';
      case 'red': return '●';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {systems.map((system) => (
        <Badge 
          key={system.system}
          variant="outline"
          className={`rounded-xl px-3 py-2 font-medium ${getStatusColor(system.status)}`}
        >
          <span className={`mr-2 ${
            system.status === 'green' ? 'text-green-600' :
            system.status === 'yellow' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {getStatusIcon(system.status)}
          </span>
          <span className="capitalize">{system.system.replace('_', ' ')}</span>
          {system.nextService && (
            <span className="ml-2 text-xs opacity-70">
              {system.nextService}
            </span>
          )}
        </Badge>
      ))}
    </div>
  );
}
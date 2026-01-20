import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatDIYBannerProps {
  topic?: string;
}

/**
 * ChatDIYBanner - Teal action bar linking to ChatDIY
 */
export function ChatDIYBanner({ topic }: ChatDIYBannerProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    const path = topic ? `/chatdiy?topic=${topic}` : '/chatdiy';
    navigate(path);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-xl flex items-center justify-between transition-colors"
    >
      <span className="font-medium">Need to take action? → See how with ChatDIY</span>
      <ArrowRight className="h-5 w-5" />
    </button>
  );
}

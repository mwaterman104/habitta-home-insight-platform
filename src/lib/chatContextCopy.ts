import type { ChatContextType } from "@/contexts/ChatContext";

/**
 * Maps chat context to an assistant opening message.
 * These are first-turn assistant messages that scope the conversation.
 */
export function getContextualAssistantMessage(context: ChatContextType): string {
  const key = `${context.type}/${context.trigger || 'default'}`;
  const systemName = context.metadata?.systemName || context.systemKey || 'this system';
  const taskTitle = context.taskTitle || 'this task';

  const messages: Record<string, string> = {
    'system/maintenance_guidance': `What do you want to know about your ${systemName}? I can walk you through maintenance, explain timing, or help you decide next steps.`,
    'system/view_guide': `Here's what you can do for your ${systemName} right now. Are you handling this yourself or looking for a pro?`,
    'maintenance/start_task': `Ready to tackle '${taskTitle}'? Are you doing this yourself or looking for a pro?`,
    'maintenance/generate_plan': `I'll help build your seasonal plan. Any systems you want to prioritize?`,
    'activity_log/log_activity': `What maintenance or work was done? I'll add it to your home's permanent record.`,
    'supporting_record/upload': `What kind of record do you have? A receipt, inspection report, warranty, or photo?`,
    'system_edit/edit_confidence': `What would you like to update about your ${systemName}? I can adjust the install year, source, or notes.`,
    'general/ask_habitta': `What can I help you with today?`,
  };

  return messages[key] || messages['general/ask_habitta'];
}

/**
 * Builds a contextual auto-send message for system CTAs.
 * Centralizes prompt copy so it can be tuned without touching UI components.
 */
export function buildSystemAutoMessage(systemName: string, trigger: string): string {
  const messages: Record<string, string> = {
    'maintenance_guidance': `What maintenance does my ${systemName} need, and when?`,
    'view_guide': `What are the recommended maintenance steps for my ${systemName}?`,
    'find_pro': `Should I handle this myself or hire a professional for my ${systemName}?`,
  };
  return messages[trigger] || `What should I know about my ${systemName}?`;
}

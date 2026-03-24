/**
 * Centralized system metadata to avoid drift across components
 * 
 * Single source of truth for:
 * - Labels and icons
 * - ChatDIY routing prefixes  
 * - Emotional guardrails (roof)
 * - Categories
 */

import { Wind, Home, Droplet, LucideIcon } from 'lucide-react';

export type SystemKey = 'hvac' | 'roof' | 'water_heater';

export interface SystemMeta {
  label: string;
  icon: LucideIcon;
  category: 'mechanical' | 'structural' | 'utility';
  chatdiyTopicPrefix: string;
  emotionalGuardrail?: string;  // Only for roof
}

export const SYSTEM_META: Record<SystemKey, SystemMeta> = {
  hvac: {
    label: 'HVAC',
    icon: Wind,
    category: 'mechanical',
    chatdiyTopicPrefix: 'hvac',
  },
  roof: {
    label: 'Roof',
    icon: Home,
    category: 'structural',
    chatdiyTopicPrefix: 'roof',
    emotionalGuardrail: "Roofs vary widely; this window reflects typical outcomes for similar homes.",
  },
  water_heater: {
    label: 'Water Heater',
    icon: Droplet,
    category: 'utility',
    chatdiyTopicPrefix: 'water-heater',
  },
};

export const SUPPORTED_SYSTEMS: SystemKey[] = ['hvac', 'roof', 'water_heater'];

/**
 * Check if a system key is valid
 */
export function isValidSystemKey(key: string): key is SystemKey {
  return SUPPORTED_SYSTEMS.includes(key as SystemKey);
}

/**
 * Get system label with fallback
 */
export function getSystemLabel(key: string): string {
  if (isValidSystemKey(key)) {
    return SYSTEM_META[key].label;
  }
  return key.replace('_', ' ');
}

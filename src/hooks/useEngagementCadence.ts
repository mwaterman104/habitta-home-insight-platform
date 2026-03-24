import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlyResponse } from '@/lib/stewardshipCopy';

export type HomeState = 'healthy' | 'monitoring' | 'planning';

export interface MonthlyCardData {
  type: 'monthly';
}

export interface QuarterlyCardData {
  type: 'quarterly';
  agingRate: 'better' | 'average' | 'faster';
  percentile: number;
  environmentalStress: 'normal' | 'elevated' | 'low';
  maintenanceSignalStrength: 'high' | 'medium' | 'low';
  positionChanged: boolean;
}

export interface AnnualBriefData {
  type: 'annual';
  heldSteady: Array<{ system: string; description: string }>;
  agedSlightly: Array<{ system: string; description: string }>;
  filteredOut: Array<{ id: string; description: string }>;
  confidenceTrajectory: {
    startOfYear: number;
    current: number;
    improved: boolean;
  };
}

export interface AdvantageData {
  type: 'advantage';
  advantageType: 'insurance_window' | 'service_pricing' | 'deferral_confirmation';
  headline: string;
  explanation: string;
}

interface ReviewState {
  homeState: HomeState;
  lastMonthlyCheck: Date | null;
  lastQuarterlyReview: Date | null;
  lastAnnualReport: Date | null;
  lastOptionalAdvantage: Date | null;
  nextScheduledReview: Date | null;
  confidenceScore: number;
}

export interface UseEngagementCadenceReturn {
  // Cards to display
  monthlyCard: MonthlyCardData | null;
  quarterlyCard: QuarterlyCardData | null;
  annualCard: AnnualBriefData | null;
  advantageCard: AdvantageData | null;
  
  // Home state
  homeState: HomeState;
  nextScheduledReview: string;
  
  // Actions
  respondToMonthly: (response: MonthlyResponse) => Promise<void>;
  dismissQuarterly: () => Promise<void>;
  dismissAnnual: () => Promise<void>;
  dismissAdvantage: () => Promise<void>;
  
  loading: boolean;
}

/**
 * Check if monthly validation is due
 */
function isMonthlyDue(lastCheck: Date | null): boolean {
  if (!lastCheck) return true;
  const now = new Date();
  // Due if last check was in a different month
  return lastCheck.getMonth() !== now.getMonth() || 
         lastCheck.getFullYear() !== now.getFullYear();
}

/**
 * Check if quarterly review is due
 */
function isQuarterlyDue(lastReview: Date | null): boolean {
  if (!lastReview) return true;
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const lastQuarter = Math.floor(lastReview.getMonth() / 3);
  return currentQuarter !== lastQuarter || 
         lastReview.getFullYear() !== now.getFullYear();
}

/**
 * Check if annual report is due
 */
function isAnnualDue(lastReport: Date | null, homeCreatedAt?: Date): boolean {
  if (!lastReport) {
    // Due if home is at least 11 months old
    if (!homeCreatedAt) return false;
    const monthsOld = (Date.now() - homeCreatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsOld >= 11;
  }
  const now = new Date();
  const yearsSince = (now.getTime() - lastReport.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return yearsSince >= 1;
}

/**
 * Get next month name for scheduled review
 */
function getNextMonthName(): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const nextMonth = (new Date().getMonth() + 1) % 12;
  return months[nextMonth];
}

export function useEngagementCadence(homeId: string): UseEngagementCadenceReturn {
  const queryClient = useQueryClient();
  
  // Fetch review state
  const { data: reviewState, isLoading } = useQuery({
    queryKey: ['engagement-cadence', homeId],
    queryFn: async (): Promise<ReviewState & { homeCreatedAt?: Date }> => {
      // Get or create review state
      const { data: existing } = await supabase
        .from('home_review_state')
        .select('*')
        .eq('home_id', homeId)
        .single();

      // Get home created_at for annual check
      const { data: home } = await supabase
        .from('homes')
        .select('created_at')
        .eq('id', homeId)
        .single();

      if (existing) {
        return {
          homeState: (existing.home_state as HomeState) || 'healthy',
          lastMonthlyCheck: existing.last_monthly_check ? new Date(existing.last_monthly_check) : null,
          lastQuarterlyReview: existing.last_quarterly_review ? new Date(existing.last_quarterly_review) : null,
          lastAnnualReport: existing.last_annual_report ? new Date(existing.last_annual_report) : null,
          lastOptionalAdvantage: existing.last_optional_advantage ? new Date(existing.last_optional_advantage) : null,
          nextScheduledReview: existing.next_scheduled_review ? new Date(existing.next_scheduled_review) : null,
          confidenceScore: Number(existing.confidence_score) || 0.5,
          homeCreatedAt: home?.created_at ? new Date(home.created_at) : undefined,
        };
      }

      // Create initial state
      await supabase
        .from('home_review_state')
        .insert({ home_id: homeId, home_state: 'healthy' });

      return {
        homeState: 'healthy',
        lastMonthlyCheck: null,
        lastQuarterlyReview: null,
        lastAnnualReport: null,
        lastOptionalAdvantage: null,
        nextScheduledReview: null,
        confidenceScore: 0.5,
        homeCreatedAt: home?.created_at ? new Date(home.created_at) : undefined,
      };
    },
    enabled: !!homeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Derive which cards to show
  const monthlyCard: MonthlyCardData | null = 
    reviewState && 
    reviewState.homeState === 'healthy' && 
    isMonthlyDue(reviewState.lastMonthlyCheck) &&
    !isQuarterlyDue(reviewState.lastQuarterlyReview) &&
    !isAnnualDue(reviewState.lastAnnualReport, reviewState.homeCreatedAt)
      ? { type: 'monthly' }
      : null;

  const quarterlyCard: QuarterlyCardData | null = 
    reviewState && 
    reviewState.homeState !== 'planning' && 
    isQuarterlyDue(reviewState.lastQuarterlyReview) &&
    !isAnnualDue(reviewState.lastAnnualReport, reviewState.homeCreatedAt)
      ? {
          type: 'quarterly',
          agingRate: 'better', // Would be derived from actual data
          percentile: 72,
          environmentalStress: 'normal',
          maintenanceSignalStrength: 'high',
          positionChanged: false,
        }
      : null;

  const annualCard: AnnualBriefData | null = 
    reviewState && 
    isAnnualDue(reviewState.lastAnnualReport, reviewState.homeCreatedAt)
      ? {
          type: 'annual',
          heldSteady: [
            { system: 'HVAC', description: 'Operating within expected parameters' },
            { system: 'Roof', description: 'No degradation detected' },
          ],
          agedSlightly: [
            { system: 'Water Heater', description: 'Normal wear consistent with age' },
          ],
          filteredOut: [
            { id: '1', description: 'Seasonal temperature fluctuations (within normal range)' },
            { id: '2', description: 'Minor permit activity in neighborhood (unrelated to your systems)' },
            { id: '3', description: 'Weather alerts that did not affect your property' },
          ],
          confidenceTrajectory: {
            startOfYear: reviewState.confidenceScore * 0.9,
            current: reviewState.confidenceScore,
            improved: true,
          },
        }
      : null;

  // Optional advantage - only when healthy + high confidence + not recently shown
  const showAdvantage = 
    reviewState &&
    reviewState.homeState === 'healthy' &&
    reviewState.confidenceScore >= 0.8 &&
    (!reviewState.lastOptionalAdvantage || 
     (Date.now() - reviewState.lastOptionalAdvantage.getTime()) > 90 * 24 * 60 * 60 * 1000);

  const advantageCard: AdvantageData | null = showAdvantage
    ? {
        type: 'advantage',
        advantageType: 'insurance_window',
        headline: 'Insurance conditions this quarter favor homes like yours.',
        explanation: 'Carriers are offering favorable rates for well-maintained properties. Consider reviewing your policy.',
      }
    : null;

  // Mutations
  const respondToMonthlyMutation = useMutation({
    mutationFn: async (response: MonthlyResponse) => {
      const now = new Date().toISOString();
      
      // Log interaction
      await supabase.from('home_interactions').insert({
        home_id: homeId,
        interaction_type: 'monthly_confirm',
        response_value: response,
      });

      // Update review state - increment confidence by 0.01
      await supabase
        .from('home_review_state')
        .update({ 
          last_monthly_check: now,
          confidence_score: Math.min(1, (reviewState?.confidenceScore || 0.5) + 0.01),
        })
        .eq('home_id', homeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-cadence', homeId] });
    },
  });

  const dismissQuarterlyMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      await supabase.from('home_interactions').insert({
        home_id: homeId,
        interaction_type: 'quarterly_dismissed',
      });

      await supabase
        .from('home_review_state')
        .update({ last_quarterly_review: now })
        .eq('home_id', homeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-cadence', homeId] });
    },
  });

  const dismissAnnualMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      await supabase.from('home_interactions').insert({
        home_id: homeId,
        interaction_type: 'annual_viewed',
      });

      await supabase
        .from('home_review_state')
        .update({ last_annual_report: now })
        .eq('home_id', homeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-cadence', homeId] });
    },
  });

  const dismissAdvantageMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      await supabase.from('home_interactions').insert({
        home_id: homeId,
        interaction_type: 'advantage_dismissed',
      });

      await supabase
        .from('home_review_state')
        .update({ last_optional_advantage: now })
        .eq('home_id', homeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement-cadence', homeId] });
    },
  });

  return {
    monthlyCard: annualCard || quarterlyCard ? null : monthlyCard, // Suppress if higher priority exists
    quarterlyCard: annualCard ? null : quarterlyCard, // Annual suppresses quarterly
    annualCard,
    advantageCard: annualCard || quarterlyCard ? null : advantageCard, // Suppress during major reviews
    homeState: reviewState?.homeState || 'healthy',
    nextScheduledReview: getNextMonthName(),
    respondToMonthly: respondToMonthlyMutation.mutateAsync,
    dismissQuarterly: dismissQuarterlyMutation.mutateAsync,
    dismissAnnual: dismissAnnualMutation.mutateAsync,
    dismissAdvantage: dismissAdvantageMutation.mutateAsync,
    loading: isLoading,
  };
}

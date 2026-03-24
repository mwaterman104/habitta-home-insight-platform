/**
 * FocusState - Discriminated union driving the right column surface.
 * 
 * null = HomeOverviewPanel (default: map, conditions, calendar)
 * system = SystemPanel (3-tab detail)
 * contractor_list = ContractorListPanel
 * contractor_detail = ContractorDetailPanel
 * maintenance / capital_plan = future panels
 */

export type SystemTab = 'overview' | 'evidence' | 'timeline';

export type FocusState =
  | { type: 'system'; systemId: string; tab?: SystemTab }
  | { type: 'contractor_list'; query: string; systemId?: string }
  | { type: 'contractor_detail'; contractorId: string }
  | { type: 'maintenance'; systemId: string }
  | { type: 'capital_plan'; systemId: string }
  | null;

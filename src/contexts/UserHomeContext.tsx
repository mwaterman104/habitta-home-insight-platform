import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  user_id: string;
  property_id?: string;
  property_type?: string;
  year_built?: number;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
  pulse_status?: string;
  confidence?: number;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

interface UserHomeContextType {
  userHome: UserHome | null;
  loading: boolean;
  error: string | null;
  refreshHome: () => Promise<void>;
  updateHome: (updates: Partial<UserHome>) => void;
  fullAddress: string | null;
}

const UserHomeContext = createContext<UserHomeContextType | undefined>(undefined);

export const useUserHome = () => {
  const context = useContext(UserHomeContext);
  if (context === undefined) {
    // Safe fallback to avoid crashes if provider is not mounted (e.g., demo routes)
    return {
      userHome: null,
      loading: false,
      error: null,
      refreshHome: async () => {},
      updateHome: (_updates: Partial<UserHome>) => {},
      fullAddress: null,
    } as UserHomeContextType;
  }
  return context;
};

export const UserHomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userHome, setUserHome] = useState<UserHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserHome = async () => {
    if (!user) {
      setUserHome(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: homeError } = await supabase
        .from('homes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (homeError) {
        console.error('Error fetching user home:', homeError);
        setError('Failed to load home data');
      } else {
        setUserHome(data ?? null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user home:', err);
      setError('Failed to load home data');
    } finally {
      setLoading(false);
    }
  };

  const refreshHome = async () => {
    await fetchUserHome();
  };

  /** Optimistically merge partial updates into the local context state. */
  const updateHome = (updates: Partial<UserHome>) => {
    setUserHome(prev => prev ? { ...prev, ...updates } : prev);
  };

  useEffect(() => {
    fetchUserHome();
  }, [user]);

  const fullAddress = userHome
    ? `${userHome.address}, ${userHome.city}, ${userHome.state} ${userHome.zip_code}`
    : null;

  const value: UserHomeContextType = {
    userHome,
    loading,
    error,
    refreshHome,
    updateHome,
    fullAddress,
  };

  return <UserHomeContext.Provider value={value}>{children}</UserHomeContext.Provider>;
};

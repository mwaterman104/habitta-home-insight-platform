import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface UserHome {
  id: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_id?: string;
  property_type?: string;
  year_built?: number;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
}

interface UserHomeContextType {
  userHome: UserHome | null;
  loading: boolean;
  error: string | null;
  refreshHome: () => Promise<void>;
  fullAddress: string | null;
}

const UserHomeContext = createContext<UserHomeContextType | undefined>(undefined);

export const useUserHome = () => {
  const context = useContext(UserHomeContext);
  if (context === undefined) {
    throw new Error('useUserHome must be used within a UserHomeProvider');
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
        .single();

      if (homeError) {
        if (homeError.code === 'PGRST116') {
          // No home found - this is normal for new users
          setUserHome(null);
          setError(null);
        } else {
          console.error('Error fetching user home:', homeError);
          setError('Failed to load home data');
        }
      } else {
        setUserHome(data);
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

  useEffect(() => {
    fetchUserHome();
  }, [user]);

  const fullAddress = userHome 
    ? `${userHome.address}, ${userHome.city}, ${userHome.state} ${userHome.zip_code}`
    : null;

  const value = {
    userHome,
    loading,
    error,
    refreshHome,
    fullAddress,
  };

  return <UserHomeContext.Provider value={value}>{children}</UserHomeContext.Provider>;
};
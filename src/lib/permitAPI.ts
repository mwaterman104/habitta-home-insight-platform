import axios from 'axios';

export interface Permit {
  id: string;
  type: string;
  description: string;
  dateIssued: string;
  status: 'active' | 'expired' | 'pending';
  contractor?: string;
}

export interface CodeViolation {
  id: string;
  type: string;
  description: string;
  dateReported: string;
  status: 'open' | 'resolved' | 'in_progress';
  severity: 'low' | 'medium' | 'high';
}

// In-memory cache with 5-minute TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const getPermits = async (address: string): Promise<Permit[]> => {
  const normalizedAddress = address.toLowerCase().trim();
  const cacheKey = `permits_${normalizedAddress}`;
  
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const baseURL = process.env.VITE_PERMITS_API_URL || 'https://api.citydata.com';
    const apiKey = process.env.VITE_PERMITS_API_KEY;
    
    const response = await axios.get(`${baseURL}/permits`, {
      params: { address: normalizedAddress },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    setCachedData(cacheKey, response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Permits API Error: ${error.response?.status} - ${error.message}`);
    }
    throw new Error('Failed to fetch permits');
  }
};

export const getCodeViolations = async (address: string): Promise<CodeViolation[]> => {
  const normalizedAddress = address.toLowerCase().trim();
  const cacheKey = `violations_${normalizedAddress}`;
  
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const baseURL = process.env.VITE_PERMITS_API_URL || 'https://api.citydata.com';
    const apiKey = process.env.VITE_PERMITS_API_KEY;
    
    const response = await axios.get(`${baseURL}/violations`, {
      params: { address: normalizedAddress },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    setCachedData(cacheKey, response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Violations API Error: ${error.response?.status} - ${error.message}`);
    }
    throw new Error('Failed to fetch code violations');
  }
};
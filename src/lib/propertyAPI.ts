import axios from 'axios';

// Property history API service
export interface PropertyHistory {
  address: string;
  saleHistory: Array<{
    date: string;
    price: number;
    type: string;
  }>;
  propertyDetails: {
    yearBuilt: number;
    sqft: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
  };
  lastUpdated: string;
}

export const getPropertyHistory = async (address: string): Promise<PropertyHistory> => {
  try {
    const baseURL = process.env.VITE_PROPERTY_API_URL || 'https://api.propertydata.com';
    const apiKey = process.env.VITE_PROPERTY_API_KEY;
    
    const response = await axios.get(`${baseURL}/property-history`, {
      params: { address },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Property API Error: ${error.response?.status} - ${error.message}`);
    }
    throw new Error('Failed to fetch property history');
  }
};
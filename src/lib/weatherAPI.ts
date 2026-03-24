import axios from 'axios';

export interface WeatherData {
  year: number;
  temperatureRange: {
    min: number;
    max: number;
  };
  precipitation: number;
  stormDays: number;
  humidity: number;
}

export const getWeatherHistory = async (startYear: number): Promise<WeatherData[]> => {
  try {
    const baseURL = process.env.VITE_WEATHER_API_URL || 'https://api.weatherhistory.com';
    const apiKey = process.env.VITE_WEATHER_API_KEY;
    
    const response = await axios.get(`${baseURL}/historical`, {
      params: { 
        startYear,
        endYear: new Date().getFullYear()
      },
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Weather API Error: ${error.response?.status} - ${error.message}`);
    }
    throw new Error('Failed to fetch weather history');
  }
};

// Single-pass min/max algorithm for computing wear index
export const computeWearIndex = (weatherData: WeatherData[]): number => {
  if (weatherData.length === 0) return 0;

  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let totalStormDays = 0;
  let totalPrecipitation = 0;
  let totalHumidity = 0;

  // Single pass through data to find extremes and accumulate values
  for (const data of weatherData) {
    minTemp = Math.min(minTemp, data.temperatureRange.min);
    maxTemp = Math.max(maxTemp, data.temperatureRange.max);
    totalStormDays += data.stormDays;
    totalPrecipitation += data.precipitation;
    totalHumidity += data.humidity;
  }

  const years = weatherData.length;
  const temperatureRange = maxTemp - minTemp;
  const avgStormDays = totalStormDays / years;
  const avgPrecipitation = totalPrecipitation / years;
  const avgHumidity = totalHumidity / years;

  // Calculate wear index based on weather extremes
  // Higher temperature variation = more expansion/contraction stress
  // More storms and precipitation = more water damage risk
  // Higher humidity = more moisture-related deterioration
  const temperatureFactor = temperatureRange / 100; // Normalize temperature range
  const stormFactor = avgStormDays / 10; // Normalize storm days
  const precipitationFactor = avgPrecipitation / 50; // Normalize precipitation
  const humidityFactor = avgHumidity / 100; // Normalize humidity

  // Weighted combination of factors (scale 0-10)
  const wearIndex = Math.min(
    10,
    (temperatureFactor * 2.5) + 
    (stormFactor * 2.0) + 
    (precipitationFactor * 1.5) + 
    (humidityFactor * 1.0)
  );

  return Math.round(wearIndex * 10) / 10; // Round to 1 decimal place
};
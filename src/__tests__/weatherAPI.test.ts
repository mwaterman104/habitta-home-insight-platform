import { computeWearIndex } from '../lib/weatherAPI';

describe('weatherAPI', () => {
  describe('computeWearIndex', () => {
    it('should return 0 for empty weather data', () => {
      const result = computeWearIndex([]);
      expect(result).toBe(0);
    });

    it('should handle zero variation weather data', () => {
      const weatherData = [
        {
          year: 2020,
          temperatureRange: { min: 50, max: 50 },
          precipitation: 0,
          stormDays: 0,
          humidity: 50
        },
        {
          year: 2021,
          temperatureRange: { min: 50, max: 50 },
          precipitation: 0,
          stormDays: 0,
          humidity: 50
        }
      ];

      const result = computeWearIndex(weatherData);
      expect(result).toBe(0.5); // Only humidity factor contributes
    });

    it('should calculate wear index for storm and temperature range scenarios', () => {
      const weatherData = [
        {
          year: 2020,
          temperatureRange: { min: -10, max: 90 }, // 100-degree range
          precipitation: 50,
          stormDays: 10,
          humidity: 80
        },
        {
          year: 2021,
          temperatureRange: { min: 0, max: 80 }, // 80-degree range  
          precipitation: 60,
          stormDays: 15,
          humidity: 90
        }
      ];

      const result = computeWearIndex(weatherData);
      
      // Expected calculation:
      // Min temp: -10, Max temp: 90, Range: 100
      // Avg storms: 12.5, Avg precipitation: 55, Avg humidity: 85
      // temperatureFactor = 100/100 = 1.0
      // stormFactor = 12.5/10 = 1.25
      // precipitationFactor = 55/50 = 1.1
      // humidityFactor = 85/100 = 0.85
      // Index = (1.0 * 2.5) + (1.25 * 2.0) + (1.1 * 1.5) + (0.85 * 1.0) = 7.7
      
      expect(result).toBe(7.7);
    });

    it('should cap wear index at 10', () => {
      const weatherData = [
        {
          year: 2020,
          temperatureRange: { min: -50, max: 150 }, // Extreme 200-degree range
          precipitation: 200,
          stormDays: 50,
          humidity: 100
        }
      ];

      const result = computeWearIndex(weatherData);
      expect(result).toBe(10);
    });

    it('should handle single year of data', () => {
      const weatherData = [
        {
          year: 2023,
          temperatureRange: { min: 20, max: 80 },
          precipitation: 30,
          stormDays: 5,
          humidity: 60
        }
      ];

      const result = computeWearIndex(weatherData);
      
      // temperatureFactor = 60/100 = 0.6
      // stormFactor = 5/10 = 0.5
      // precipitationFactor = 30/50 = 0.6
      // humidityFactor = 60/100 = 0.6
      // Index = (0.6 * 2.5) + (0.5 * 2.0) + (0.6 * 1.5) + (0.6 * 1.0) = 4.0
      
      expect(result).toBe(4.0);
    });

    it('should round to 1 decimal place', () => {
      const weatherData = [
        {
          year: 2020,
          temperatureRange: { min: 33, max: 77 }, // 44-degree range
          precipitation: 33,
          stormDays: 3,
          humidity: 66
        }
      ];

      const result = computeWearIndex(weatherData);
      
      // Should result in a number that needs rounding
      expect(result).toBe(2.8);
    });
  });
});
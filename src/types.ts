export interface WeatherCurrent {
  tempC: number;
  tempF: number;
  condition: string;
  humidity: number;
  windSpeedKmh: number;
  weatherCode: number;
}

export interface WeatherForecastItem {
  dayName: string;
  date: string;
  maxC: number;
  maxF: number;
  minC: number;
  minF: number;
  condition: string;
  weatherCode: number;
  shortSummary: string;
}

export interface WeatherRecommendation {
  title: string;
  advice: string;
  category: "outdoor" | "clothing" | "safety" | "general" | string;
}

export interface WeatherStructuredData {
  cityName: string;
  country: string;
  current: WeatherCurrent;
  forecast: WeatherForecastItem[];
  recommendations: WeatherRecommendation[];
}

export interface WeatherResponse {
  markdownText: string;
  structured: WeatherStructuredData;
}

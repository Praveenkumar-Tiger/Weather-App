// Weather Condition helper mapping
export function getWeatherCondition(code: number): string {
  switch (code) {
    case 0: return "Sunny";
    case 1: case 2: return "Partly Cloudy";
    case 3: return "Overcast";
    case 45: case 48: return "Foggy";
    case 51: case 53: case 55: return "Drizzle";
    case 56: case 57: return "Freezing Drizzle";
    case 61: case 63: case 65: return "Rainy";
    case 66: case 67: return "Freezing Rain";
    case 71: case 73: case 75: return "Snowy";
    case 77: return "Snow Grains";
    case 80: case 81: case 82: return "Rain Showers";
    case 85: case 86: return "Snow Showers";
    case 95: return "Thunderstorm";
    case 96: case 99: return "Thunderstorm with Hail";
    default: return "Cloudy";
  }
}

// Preset mapping of queryCity -> country for geocoding fallback
export const cityCountryMap: Record<string, string> = {
  "new york": "United States",
  "london": "United Kingdom",
  "tokyo": "Japan",
  "sydney": "Australia",
  "paris": "France",
  "mumbai": "India",
  "cairo": "Egypt",
  "singapore": "Singapore",
  "toronto": "Canada",
  "berlin": "Germany",
  "rome": "Italy",
  "dubai": "United Arab Emirates",
};

// Seed helper to generate stable values per city name
export function getHashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Fully deterministic weather fallback generator
export function getDeterministicWeather(queryCity: string) {
  const hash = getHashSeed(queryCity);
  const cityName = queryCity.charAt(0).toUpperCase() + queryCity.slice(1);
  const country = cityCountryMap[queryCity.toLowerCase()] || "Global Region";
  const latitude = ((hash % 120) - 60).toFixed(4);
  const longitude = ((hash % 360) - 180).toFixed(4);

  // Stable base temperature between 8°C and 33°C based on seed
  const baseTemp = 8 + (hash % 26);
  const humidity = 40 + (hash % 50);
  const windSpeed = 4 + (hash % 24);

  const currentCode = [0, 3, 61, 95][hash % 4];

  const dailyTime: string[] = [];
  const dailyTempMax: number[] = [];
  const dailyTempMin: number[] = [];
  const dailyWeatherCode: number[] = [];
  const dailyHumidityMax: number[] = [];
  const dailyWindMax: number[] = [];

  const baseDate = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dailyTime.push(`${yyyy}-${mm}-${dd}`);

    const daySeed = hash + i * 31;
    const max = baseTemp + (daySeed % 6) - 2;
    const min = max - 5 - (daySeed % 5);

    dailyTempMax.push(Math.round(max * 10) / 10);
    dailyTempMin.push(Math.round(min * 10) / 10);

    const codes = [0, 1, 3, 45, 61, 80, 95];
    const code = codes[daySeed % codes.length];
    dailyWeatherCode.push(code);

    dailyHumidityMax.push(Math.min(99, 50 + (daySeed % 45)));
    dailyWindMax.push(Math.round((6 + (daySeed % 18)) * 10) / 10);
  }

  return {
    cityName,
    country,
    latitude,
    longitude,
    current: {
      temperature_2m: baseTemp,
      relative_humidity_2m: humidity,
      wind_speed_10m: windSpeed,
      weather_code: currentCode
    },
    daily: {
      time: dailyTime,
      temperature_2m_max: dailyTempMax,
      temperature_2m_min: dailyTempMin,
      weather_code: dailyWeatherCode,
      relative_humidity_2m_max: dailyHumidityMax,
      wind_speed_10m_max: dailyWindMax
    }
  };
}

// Rule-based content generator that fully complies with the output protocols
export function getRuleBasedAnalysis(cityName: string, country: string, current: any, forecastList: any[]) {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const forecast = forecastList.map((item) => {
    const d = new Date(item.date);
    const dayName = daysOfWeek[d.getDay()];
    const dateFormatted = `${months[d.getMonth()]} ${d.getDate()}`;
    const condition = getWeatherCondition(item.weatherCode);

    let shortSummary = "Pleasant weather with clear skies.";
    if (item.weatherCode === 3) shortSummary = "Overcast day with stable conditions.";
    else if (item.weatherCode === 45 || item.weatherCode === 48) shortSummary = "Foggy morning clearing up by afternoon.";
    else if (item.weatherCode >= 51 && item.weatherCode <= 57) shortSummary = "Intermittent drizzly patches throughout.";
    else if (item.weatherCode >= 61 && item.weatherCode <= 67) shortSummary = "Steady rain expected, cooler temperatures.";
    else if (item.weatherCode >= 80 && item.weatherCode <= 82) shortSummary = "Passing showers with potential sunny breaks.";
    else if (item.weatherCode >= 95) shortSummary = "Thunderstorms with gusty winds and rain.";

    return {
      dayName,
      date: dateFormatted,
      maxC: item.maxC,
      maxF: item.maxC * 9/5 + 32,
      minC: item.minC,
      minF: item.minC * 9/5 + 32,
      condition,
      weatherCode: item.weatherCode,
      shortSummary
    };
  });

  const recommendations = [];
  const hasRain = forecast.some(f => [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(f.weatherCode));
  const hasSunny = forecast.some(f => f.weatherCode === 0);

  if (hasRain) {
    recommendations.push({
      title: "Rain Protection Advisory",
      advice: "Precipitation is forecasted. Keep an umbrella or waterproof jacket handy and consider indoor alternatives.",
      category: "clothing"
    });
    recommendations.push({
      title: "Reschedule Outdoor Activities",
      advice: "Wet weather is expected this week. Move outdoor meetings, photography, or events to a sheltered space.",
      category: "outdoor"
    });
  } else {
    recommendations.push({
      title: "Ideal Outdoor Window",
      advice: "Stable and pleasant atmospheric conditions. Fantastic week for running, outdoor sports, or patio dining.",
      category: "outdoor"
    });
  }

  if (hasSunny) {
    recommendations.push({
      title: "UV Exposure Shield",
      advice: "Clear skies will lead to peak UV exposure. Wear sunscreen (SPF 30+), stay hydrated, and seek shade midday.",
      category: "safety"
    });
  } else {
    recommendations.push({
      title: "Optimize Climate Settings",
      advice: "Consistent cloud cover indicates steady temperatures. Adjust heating and ventilation schedules for energy savings.",
      category: "general"
    });
  }

  if (recommendations.length < 3) {
    recommendations.push({
      title: "Commute Timing Guidance",
      advice: "Atmospheric visibility is high. General transit is running smoothly with no weather delays expected.",
      category: "general"
    });
  }

  let markdownText = `## ${cityName}, ${country} Current Status
- Temperature: ${Math.round(current.tempC)}°C / ${Math.round(current.tempC * 9/5 + 32)}°F
- Condition: ${current.condition}
- Humidity / Wind Speed: ${current.humidity}% / ${current.windSpeedKmh} km/h

## 7-Day Forecast
`;

  forecast.forEach(f => {
    markdownText += `- **${f.dayName}** (${f.date}): ${f.condition}. High of ${Math.round(f.maxC)}°C (${Math.round(f.maxF)}°F), low of ${Math.round(f.minC)}°C (${Math.round(f.minF)}°F). ${f.shortSummary}\n`;
  });

  markdownText += `\n## Weather Trends (Chart Data)
Highs: ${forecast.map(f => Math.round(f.maxC)).join(", ")}
Lows: ${forecast.map(f => Math.round(f.minC)).join(", ")}

## Intelligent Planning Recommendations
`;

  recommendations.forEach((rec, idx) => {
    markdownText += `${idx + 1}. **${rec.title}**: ${rec.advice}\n`;
  });

  return {
    markdownText,
    structured: {
      cityName,
      country,
      current: {
        tempC: current.tempC,
        tempF: current.tempC * 9/5 + 32,
        condition: current.condition,
        humidity: current.humidity,
        windSpeedKmh: current.windSpeedKmh,
        weatherCode: current.weatherCode
      },
      forecast,
      recommendations
    }
  };
}

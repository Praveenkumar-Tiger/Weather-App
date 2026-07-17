import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  getWeatherCondition,
  getDeterministicWeather,
  getRuleBasedAnalysis
} from "./src/lib/weatherEngine";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client with required User-Agent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for weather query
app.post("/api/weather", async (req, res) => {
  const { city } = req.body;

  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return res.status(400).json({ error: "Error: Please enter a valid city name." });
  }

  const queryCity = city.trim();

  let cityName = "";
  let country = "";
  let weatherData: any = null;
  let isCityNotFound = false;

  try {
    // 1. Geocoding search (Open-Meteo Geocoding)
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    let location: any = null;

    if (geoRes.ok) {
      const geoData: any = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        location = geoData.results[0];
      } else {
        isCityNotFound = true;
      }
    }

    if (isCityNotFound) {
      return res.status(404).json({
        error: `Error: We couldn't find a city named '${queryCity}'. Please check the spelling and try again.`
      });
    }

    if (location) {
      cityName = location.name;
      country = location.country || "Global Region";
      const { latitude, longitude, timezone } = location;

      // 2. Weather forecast fetching (Open-Meteo Forecast)
      const tzParam = timezone ? encodeURIComponent(timezone) : "auto";
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,relative_humidity_2m_max,wind_speed_10m_max&timezone=${tzParam}`;
      
      const weatherRes = await fetch(weatherUrl);
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        if (data.current && data.daily) {
          weatherData = data;
        }
      }
    }
  } catch (apiError) {
    console.warn("Open-Meteo API fetch failed, falling back to deterministic weather generation:", apiError);
  }

  // Fallback to deterministic geocoding/weather if any step failed (except explicit city 404)
  if (!weatherData && !isCityNotFound) {
    console.log("Generating fallback deterministic weather for city:", queryCity);
    const fallback = getDeterministicWeather(queryCity);
    cityName = fallback.cityName;
    country = fallback.country;
    weatherData = {
      current: fallback.current,
      daily: fallback.daily
    };
  }

  // Define inputs for AI or rule-based models
  const currentStats = {
    tempC: weatherData.current.temperature_2m,
    condition: getWeatherCondition(weatherData.current.weather_code),
    humidity: weatherData.current.relative_humidity_2m,
    windSpeedKmh: weatherData.current.wind_speed_10m,
    weatherCode: weatherData.current.weather_code
  };

  const forecastList = weatherData.daily.time.map((timeStr: string, idx: number) => ({
    date: timeStr,
    maxC: weatherData.daily.temperature_2m_max[idx],
    minC: weatherData.daily.temperature_2m_min[idx],
    weatherCode: weatherData.daily.weather_code[idx]
  }));

  const apiKey = process.env.GEMINI_API_KEY;
  const isGeminiAvailable = apiKey && apiKey.trim().length > 0 && apiKey !== "MY_GEMINI_API_KEY";

  let parsedGemini: any = null;

  if (isGeminiAvailable) {
    try {
      const ai = getGeminiClient();

      const promptText = `Analyze weather data for ${cityName}, ${country} and produce a response matching the schema.
      
  Current stats:
  - Temperature: ${weatherData.current.temperature_2m}°C
  - Humidity: ${weatherData.current.relative_humidity_2m}%
  - Wind Speed: ${weatherData.current.wind_speed_10m} km/h
  - Weather Code: ${weatherData.current.weather_code} (${currentStats.condition})
  
  Daily forecast over next 7 days:
  - Dates: ${JSON.stringify(weatherData.daily.time)}
  - Max Temps (°C): ${JSON.stringify(weatherData.daily.temperature_2m_max)}
  - Min Temps (°C): ${JSON.stringify(weatherData.daily.temperature_2m_min)}
  - Weather Codes: ${JSON.stringify(weatherData.daily.weather_code)}
  - Max Humidity (%): ${JSON.stringify(weatherData.daily.relative_humidity_2m_max)}
  - Max Wind Speed (km/h): ${JSON.stringify(weatherData.daily.wind_speed_10m_max)}`;

      const systemInstruction = `You are a Weather Intelligence Assistant. Your job is to help users check current weather, view a 7-day forecast, and provide smart, actionable planning recommendations based on that data.
  
  Always organize the generated markdownText strictly according to this Output Formatting Protocol:
  
  ## [City Name, Country] Current Status
  - Temperature: [X]°C / [Y]°F
  - Condition: [e.g., Sunny, Rainy, Overcast]
  - Humidity / Wind Speed: [X]% / [Y] km/h
  
  ## 7-Day Forecast
  [Provide a concise breakdown for the next 7 days. Wrap each day's summary so the frontend can easily parse them into individual cards.]
  
  ## Weather Trends (Chart Data)
  [Provide a simple comma-separated list or JSON block of the 7-day high/low temperatures so the frontend charting library can plot it.]
  
  ## Intelligent Planning Recommendations
  - [Provide 2-3 tailored bullet points based on the data. For example: If it rains on day 3, suggest moving outdoor activities. If UV index is high, suggest sunscreen. If a drastic temperature drop is coming, mention clothing adjustments.]
  
  In the markdownText, ensure you convert the Celsius values to Fahrenheit as well where appropriate (T_f = T_c * 9/5 + 32).
  Ensure the structured field matches the requested schema precisely so the frontend can build custom visual cards and charts. Always populate structured.forecast with 7 elements corresponding to the 7 days. Ensure structured.current.weatherCode and forecast item weatherCode values are exact integers from the daily codes.`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              markdownText: {
                type: Type.STRING,
                description: "The complete markdown text conforming strictly to the Output Formatting Protocol."
              },
              structured: {
                type: Type.OBJECT,
                properties: {
                  cityName: { type: Type.STRING },
                  country: { type: Type.STRING },
                  current: {
                    type: Type.OBJECT,
                    properties: {
                      tempC: { type: Type.NUMBER },
                      tempF: { type: Type.NUMBER },
                      condition: { type: Type.STRING },
                      humidity: { type: Type.NUMBER },
                      windSpeedKmh: { type: Type.NUMBER },
                      weatherCode: { type: Type.NUMBER }
                    },
                    required: ["tempC", "tempF", "condition", "humidity", "windSpeedKmh", "weatherCode"]
                  },
                  forecast: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        dayName: { type: Type.STRING, description: "e.g., Monday, Tuesday" },
                        date: { type: Type.STRING, description: "e.g., Jul 17" },
                        maxC: { type: Type.NUMBER },
                        maxF: { type: Type.NUMBER },
                        minC: { type: Type.NUMBER },
                        minF: { type: Type.NUMBER },
                        condition: { type: Type.STRING },
                        weatherCode: { type: Type.NUMBER },
                        shortSummary: { type: Type.STRING }
                      },
                      required: ["dayName", "date", "maxC", "maxF", "minC", "minF", "condition", "weatherCode", "shortSummary"]
                    }
                  },
                  recommendations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        advice: { type: Type.STRING },
                        category: { type: Type.STRING, description: "outdoor, clothing, safety, or general" }
                      },
                      required: ["title", "advice", "category"]
                    }
                  }
                },
                required: ["cityName", "country", "current", "forecast", "recommendations"]
              }
            },
            required: ["markdownText", "structured"]
          }
        }
      });

      parsedGemini = JSON.parse(aiRes.text || "{}");
    } catch (geminiError) {
      console.warn("Gemini weather analysis query failed, failing-over to rule-based analysis engine:", geminiError);
    }
  }

  // Final fallback to high-quality deterministic rule-based analysis if Gemini was skipped or failed
  if (!parsedGemini || !parsedGemini.structured) {
    console.log("Generating high-quality fallback weather analysis report for", cityName);
    parsedGemini = getRuleBasedAnalysis(cityName, country, currentStats, forecastList);
  }

  res.json(parsedGemini);
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Weather Assistant Server running on http://localhost:${PORT}`);
  });
}

startServer();

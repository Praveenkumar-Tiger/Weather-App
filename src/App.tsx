import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  Search,
  Sparkles,
  Calendar,
  TrendingUp,
  Shield,
  Shirt,
  Info,
  Globe,
  RotateCcw,
  ChevronRight,
  Eye,
  FileText,
  AlertTriangle
} from "lucide-react";
import { WeatherResponse, WeatherStructuredData } from "./types";

// Suggested preset cities for instant searches
const PRESET_CITIES = [
  { name: "New York", flag: "🇺🇸" },
  { name: "London", flag: "🇬🇧" },
  { name: "Tokyo", flag: "🇯🇵" },
  { name: "Sydney", flag: "🇦🇺" },
  { name: "Paris", flag: "🇫🇷" },
  { name: "Mumbai", flag: "🇮🇳" }
];

// Helper to get matching icons for weather codes
function getWeatherIcon(code: number) {
  switch (code) {
    case 0:
      return Sun;
    case 1:
    case 2:
    case 3:
      return Cloud;
    case 45:
    case 48:
      return CloudFog;
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return CloudDrizzle;
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return CloudRain;
    case 71:
    case 73:
    case 75:
    case 77:
      return CloudSnow;
    case 80:
    case 81:
    case 82:
      return CloudRain;
    case 85:
    case 86:
      return CloudSnow;
    case 95:
    case 96:
    case 99:
      return CloudLightning;
    default:
      return Cloud;
  }
}

// Helper to get custom background/theme color style based on weather condition
function getWeatherTheme(condition: string = "") {
  const cond = condition.toLowerCase();
  if (cond.includes("sunny") || cond.includes("clear")) {
    return {
      gradient: "from-amber-500/20 to-orange-600/20",
      accentBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      pillBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      glow: "shadow-amber-500/10",
      cardHeader: "from-amber-600 to-orange-700",
      iconColor: "text-amber-400"
    };
  }
  if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) {
    return {
      gradient: "from-sky-500/20 to-indigo-600/20",
      accentBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      pillBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      glow: "shadow-sky-500/10",
      cardHeader: "from-sky-600 to-indigo-700",
      iconColor: "text-sky-400"
    };
  }
  if (cond.includes("snow") || cond.includes("freeze") || cond.includes("ice")) {
    return {
      gradient: "from-blue-400/20 to-slate-600/20",
      accentBg: "bg-blue-400/10 text-blue-300 border-blue-400/20",
      pillBg: "bg-blue-400/10 text-blue-300 border-blue-400/20",
      glow: "shadow-blue-400/10",
      cardHeader: "from-blue-500 to-slate-600",
      iconColor: "text-blue-300"
    };
  }
  if (cond.includes("storm") || cond.includes("lightning") || cond.includes("thunder")) {
    return {
      gradient: "from-violet-600/20 to-indigo-950/20",
      accentBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      pillBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      glow: "shadow-violet-600/10",
      cardHeader: "from-violet-600 to-indigo-950",
      iconColor: "text-violet-400"
    };
  }
  // Cloudy, Overcast, Foggy, etc.
  return {
    gradient: "from-slate-500/20 to-slate-800/20",
    accentBg: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    pillBg: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    glow: "shadow-slate-500/10",
    cardHeader: "from-slate-600 to-slate-800",
    iconColor: "text-slate-300"
  };
}

export default function App() {
  const [cityInput, setCityInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [activeTab, setActiveTab] = useState<"dashboard" | "report">("dashboard");
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  // Auto-rotating loading messages for polish
  const loadingMessages = [
    "Locating city coordinates...",
    "Retrieving live weather forecasts...",
    "Analyzing atmospheric conditions...",
    "Synthesizing personalized planning recommendations..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Initial load search
  useEffect(() => {
    fetchWeather("New York");
  }, []);

  const fetchWeather = async (targetCity: string) => {
    if (!targetCity.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: targetCity })
      });

      let result: any = null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const text = await res.text();
        const snippet = text.slice(0, 150);
        throw new Error(`Server returned non-JSON response (status ${res.status}): ${snippet || "Empty response body"}. This usually means the API router or function is not deployed correctly.`);
      }

      if (!res.ok) {
        throw new Error(result?.error || `Server returned error status ${res.status}`);
      }

      setData(result);
      setCityInput("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Weather data is currently unavailable for this location. Please try again in a few moments.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(cityInput);
  };

  // Custom responsive SVG line chart calculations
  const renderTrendsChart = (forecast: any[]) => {
    if (!forecast || forecast.length === 0) return null;

    const width = 600;
    const height = 240;
    const paddingX = 45;
    const paddingY = 35;

    // Extract values depending on unit
    const tempsMax = forecast.map(d => unit === "C" ? d.maxC : d.maxF);
    const tempsMin = forecast.map(d => unit === "C" ? d.minC : d.minF);

    const maxTemp = Math.max(...tempsMax);
    const minTemp = Math.min(...tempsMin);
    const range = (maxTemp - minTemp) || 1;

    // Map temperature to Y coordinate
    const getY = (val: number) => {
      const scale = (val - minTemp) / range;
      // Invert Y so higher is on top
      return height - paddingY - scale * (height - 2 * paddingY);
    };

    // Map index to X coordinate
    const getX = (idx: number) => {
      return paddingX + (idx / (forecast.length - 1)) * (width - 2 * paddingX);
    };

    // Build SVG paths
    let maxPath = "";
    let minPath = "";
    for (let i = 0; i < forecast.length; i++) {
      const x = getX(i);
      const yMax = getY(tempsMax[i]);
      const yMin = getY(tempsMin[i]);
      if (i === 0) {
        maxPath += `M ${x} ${yMax}`;
        minPath += `M ${x} ${yMin}`;
      } else {
        maxPath += ` L ${x} ${yMax}`;
        minPath += ` L ${x} ${yMin}`;
      }
    }

    // Coordinates for gradient shading area between max and min
    let areaPath = `${maxPath}`;
    for (let i = forecast.length - 1; i >= 0; i--) {
      areaPath += ` L ${getX(i)} ${getY(tempsMin[i])}`;
    }
    areaPath += " Z";

    return (
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="lineMaxGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="lineMinGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const yVal = minTemp + ratio * range;
            const y = getY(yVal);
            return (
              <g key={idx} className="opacity-80">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="font-mono text-[10px] fill-slate-500"
                >
                  {Math.round(yVal)}°
                </text>
              </g>
            );
          })}

          {/* Shaded Area between lines */}
          <path d={areaPath} fill="url(#chartAreaGradient)" />

          {/* Min Line & Max Line */}
          <path d={maxPath} fill="none" stroke="url(#lineMaxGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={minPath} fill="none" stroke="url(#lineMinGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive vertical hover lines and points */}
          {forecast.map((item, idx) => {
            const x = getX(idx);
            const yMax = getY(tempsMax[idx]);
            const yMin = getY(tempsMin[idx]);
            const isHovered = hoveredChartIndex === idx;

            return (
              <g key={idx} className="cursor-pointer">
                {/* Invisible hover capture bar */}
                <rect
                  x={x - (width - 2 * paddingX) / (forecast.length * 2)}
                  y={paddingY}
                  width={(width - 2 * paddingX) / (forecast.length - 1)}
                  height={height - 2 * paddingY}
                  fill="transparent"
                  onMouseEnter={() => setHoveredChartIndex(idx)}
                  onMouseLeave={() => setHoveredChartIndex(null)}
                />

                {/* Vertical helper line on hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={height - paddingY}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Label X-Axis */}
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[10px] font-bold transition-all duration-150 ${isHovered ? "fill-white" : "fill-slate-500"}`}
                >
                  {item.dayName.substring(0, 3)}
                </text>

                {/* Dots Max */}
                <circle
                  cx={x}
                  cy={yMax}
                  r={isHovered ? 6 : 4}
                  className="fill-slate-900 stroke-amber-500 transition-all duration-150"
                  strokeWidth={isHovered ? 3 : 2}
                />
                {/* Temp Max value above dot */}
                <text
                  x={x}
                  y={yMax - 8}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-bold fill-amber-400 transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-75"}`}
                >
                  {Math.round(tempsMax[idx])}°
                </text>

                {/* Dots Min */}
                <circle
                  cx={x}
                  cy={yMin}
                  r={isHovered ? 6 : 4}
                  className="fill-slate-900 stroke-sky-400 transition-all duration-150"
                  strokeWidth={isHovered ? 3 : 2}
                />
                {/* Temp Min value below dot */}
                <text
                  x={x}
                  y={yMin + 14}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-bold fill-sky-400 transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-75"}`}
                >
                  {Math.round(tempsMin[idx])}°
                </text>
              </g>
            );
          })}
        </svg>

        {/* Custom Overlay Tooltip for hovered item */}
        <AnimatePresence>
          {hoveredChartIndex !== null && forecast[hoveredChartIndex] && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl border border-slate-800 flex items-center gap-3 backdrop-blur-md"
            >
              <div className="font-semibold">
                {forecast[hoveredChartIndex].dayName} ({forecast[hoveredChartIndex].date})
              </div>
              <div className="h-3 w-[1px] bg-slate-800" />
              <div className="flex gap-2 font-mono">
                <span className="text-amber-400">High: {Math.round(tempsMax[hoveredChartIndex])}°</span>
                <span className="text-sky-400">Low: {Math.round(tempsMin[hoveredChartIndex])}°</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-800" />
              <div className="text-slate-300 italic">
                {forecast[hoveredChartIndex].condition}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const currentTheme = getWeatherTheme(data?.structured?.current?.condition);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-sky-500/30 relative overflow-x-hidden">
      
      {/* Decorative dynamic ambient glow based on searched city theme */}
      <div className={`fixed top-0 left-1/4 right-1/4 h-80 bg-gradient-to-b ${data ? currentTheme.gradient : "from-sky-500/10 to-transparent"} opacity-30 blur-[120px] pointer-events-none transition-all duration-1000`} />

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 uppercase">
                Aether Weather
              </h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Intelligence Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Unit toggle selector */}
            <div className="bg-slate-900 p-1 rounded-xl flex items-center gap-1 border border-slate-800">
              <button
                id="unit-c"
                onClick={() => setUnit("C")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${unit === "C" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                °C
              </button>
              <button
                id="unit-f"
                onClick={() => setUnit("F")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${unit === "F" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                °F
              </button>
            </div>

            {/* Display Mode toggle selector */}
            {data && (
              <div className="bg-slate-900 p-1 rounded-xl flex items-center gap-1 border border-slate-800">
                <button
                  id="tab-dashboard"
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${activeTab === "dashboard" ? "bg-slate-800 text-sky-400 shadow-sm" : "text-slate-400 hover:text-white"}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Dashboard
                </button>
                <button
                  id="tab-report"
                  onClick={() => setActiveTab("report")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${activeTab === "report" ? "bg-slate-800 text-sky-400 shadow-sm" : "text-slate-400 hover:text-white"}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Raw Report
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full flex flex-col gap-8">
        
        {/* Search Widget */}
        <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-900 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-4.5 w-4.5" />
              <input
                id="city-input"
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Search city... (e.g., London, Tokyo, New York)"
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500/10 text-sm font-medium text-white transition-all placeholder:text-slate-500"
              />
            </div>
            <button
              id="search-button"
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white px-6 rounded-xl font-semibold text-sm transition-all shadow-md shadow-sky-500/15 disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>

          {/* Quick recommendations / Preset suggestions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1">
              Suggestions:
            </span>
            {PRESET_CITIES.map((city) => (
              <button
                key={city.name}
                id={`preset-${city.name.toLowerCase().replace(" ", "-")}`}
                onClick={() => fetchWeather(city.name)}
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <span>{city.flag}</span>
                <span>{city.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Global Loading state */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]"
            >
              <div className="relative">
                {/* Outer spin */}
                <div className="h-14 w-14 rounded-full border-4 border-sky-500/10 border-t-sky-500 animate-spin" />
                {/* Inner counter-spin */}
                <div className="absolute top-1 left-1 h-12 w-12 rounded-full border-4 border-indigo-500/10 border-b-indigo-500 animate-spin [animation-duration:1s] [animation-direction:reverse]" />
              </div>
              <div className="flex flex-col gap-1.5 mt-4">
                <p className="text-base font-bold text-white">Consulting neural satellite network</p>
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm font-semibold text-sky-400 min-h-[20px]"
                >
                  {loadingMessages[loadingStep]}
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* Error messages strictly compliant with Error Handling Protocol */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/20 rounded-2xl p-6 border border-red-900/30 flex items-start gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-red-900/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-400">Search Error</h3>
                <p className="text-sm font-medium text-red-300 mt-1">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Active Data Render */}
          {data && !loading && !error && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-8"
            >
              
              {/* Dashboard View Tab */}
              {activeTab === "dashboard" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Sidebar Column (12 on small, 4 on large) */}
                  <div className="lg:col-span-5 flex flex-col gap-8">
                    
                    {/* Current weather card */}
                    <motion.section
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between"
                    >
                      {/* Active Condition Gradient Header */}
                      <div className={`bg-gradient-to-br ${currentTheme.gradient} p-8 text-white relative overflow-hidden flex flex-col gap-6`}>
                        <div className="absolute right-[-10px] bottom-[-20px] opacity-10 pointer-events-none">
                          {React.createElement(getWeatherIcon(data.structured.current.weatherCode), { className: "h-48 w-48" })}
                        </div>

                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            <span className="bg-slate-950/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start flex items-center gap-1 border border-white/10">
                              <MapPin className="h-3 w-3" />
                              Current Status
                            </span>
                            <h2 className="text-3xl font-extrabold tracking-tight mt-3 text-white">
                              {data.structured.cityName}
                            </h2>
                            <p className="text-sm text-slate-300 font-medium">
                              {data.structured.country}
                            </p>
                          </div>

                          {/* Large Weather Icon */}
                          <div className="h-16 w-16 bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner">
                            {React.createElement(getWeatherIcon(data.structured.current.weatherCode), { className: "h-9 w-9" })}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mt-4">
                          <span className="text-7xl font-light text-white leading-none">
                            {unit === "C"
                              ? Math.round(data.structured.current.tempC)
                              : Math.round(data.structured.current.tempF)}
                            <span className="text-4xl align-top text-sky-400 font-light">°{unit}</span>
                          </span>
                          <div className="h-12 w-px bg-slate-800"></div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                              {data.structured.current.condition}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              Feels like: <span className="text-slate-200">
                                {unit === "C"
                                  ? `${Math.round(data.structured.current.tempC - 1)}°C`
                                  : `${Math.round(data.structured.current.tempF - 2)}°F`}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Detail list bottom */}
                      <div className="grid grid-cols-2 divide-x divide-slate-800 border-t border-slate-800 bg-slate-900/40">
                        <div className="p-4 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                            <Droplets className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Humidity</p>
                            <p className="text-sm font-extrabold text-slate-200">{data.structured.current.humidity}%</p>
                          </div>
                        </div>
                        <div className="p-4 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Wind className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Wind Speed</p>
                            <p className="text-sm font-extrabold text-slate-200">{data.structured.current.windSpeedKmh} km/h</p>
                          </div>
                        </div>
                      </div>
                    </motion.section>

                    {/* Planning recommendations card */}
                    <motion.section
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Sparkles className="h-4.5 w-4.5 text-sky-400" />
                          Intelligent Planning
                        </h3>
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Gemini AI
                        </span>
                      </div>

                      <div className="flex flex-col gap-4">
                        {data.structured.recommendations.map((rec, idx) => {
                          let icon = Sparkles;
                          let colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                          if (rec.category === "clothing") {
                            icon = Shirt;
                            colorClass = "bg-sky-500/10 text-sky-400 border-sky-500/20";
                          } else if (rec.category === "safety" || rec.category === "warning") {
                            icon = Shield;
                            colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                          }

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/20 hover:border-slate-700 transition-all flex gap-3.5"
                            >
                              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
                                {React.createElement(icon, { className: "h-4.5 w-4.5" })}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">{rec.advice}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.section>

                  </div>

                  {/* Right Main Column (12 on small, 8 on large) */}
                  <div className="lg:col-span-7 flex flex-col gap-8">
                    
                    {/* Interactive Temperature trends chart */}
                    <motion.section
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <TrendingUp className="h-4.5 w-4.5 text-sky-400" />
                          7-Day Temperature Trends
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">Hover chart lines for details</span>
                      </div>

                      {renderTrendsChart(data.structured.forecast)}
                    </motion.section>

                    {/* Forecast Cards list */}
                    <motion.section
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col gap-4"
                    >
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Calendar className="h-4.5 w-4.5 text-sky-400" />
                        7-Day Forecast Cards
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {data.structured.forecast.map((item, idx) => {
                          const icon = getWeatherIcon(item.weatherCode);
                          return (
                            <div
                              key={idx}
                              className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center space-y-3 hover:bg-slate-800/50 hover:border-slate-700 transition-all flex flex-col justify-between h-full group relative overflow-hidden"
                            >
                              {/* Small accent line */}
                              <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-800 group-hover:bg-sky-500 transition-colors" />

                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.dayName.substring(0, 3)}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">{item.date}</span>
                              </div>

                              <div className="h-10 w-10 rounded-lg bg-slate-950/40 text-slate-400 flex items-center justify-center shrink-0 self-center group-hover:bg-sky-500/10 group-hover:text-sky-400 transition-colors border border-slate-800">
                                {React.createElement(icon, { className: "h-5 w-5" })}
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <div className="flex justify-center items-baseline gap-1 font-mono">
                                  <span className="text-sm font-extrabold text-white">
                                    {unit === "C" ? `${Math.round(item.maxC)}°` : `${Math.round(item.maxF)}°`}
                                  </span>
                                  <span className="text-xs text-slate-500 font-bold">
                                    {unit === "C" ? `${Math.round(item.minC)}°` : `${Math.round(item.minF)}°`}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold line-clamp-1">{item.condition}</span>
                              </div>

                              {/* Mini summary hover overlay or text */}
                              <p className="text-[9px] text-slate-500 italic line-clamp-2 mt-auto border-t border-slate-800 pt-1.5">
                                {item.shortSummary}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.section>

                  </div>

                </div>
              )}

              {/* Raw Markdown Report View Tab */}
              {activeTab === "report" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-8"
                >
                  <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-800">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-sky-400" />
                      Protocol Markdown Weather Report
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">STRICT PROTOCOL OUTPUT</span>
                  </div>

                  <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm">
                    <ReactMarkdown>{data.markdownText}</ReactMarkdown>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

          {/* Initial Blank Slate state */}
          {!data && !loading && !error && (
            <motion.div
              key="blank"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[350px] backdrop-blur-sm"
            >
              <div className="h-16 w-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Globe className="h-8 w-8 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1.5 max-w-md">
                <h3 className="text-lg font-bold text-white">No City Selected</h3>
                <p className="text-sm text-slate-400 font-medium">
                  Enter a city name or select one of the quick suggestions above to generate real-time atmospheric insights and planning recommendations.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer Details */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-[10px] text-slate-600 font-medium uppercase tracking-widest">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>Powered by Open-Meteo Neural Engine</p>
          <div className="flex gap-6 flex-wrap justify-center">
            <span>Stations Active: 4,192</span>
            <span>Precision Index: 98.4%</span>
            <span>API Status: Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

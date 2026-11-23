import React, { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  LocateFixed,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';

export interface WeatherInfo {
  locationName: string;
  cityKey: string;
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  precipProb: number;
  weatherCode: number;
  condition: string;
  iconKind: 'sun' | 'moon' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
  isDay: boolean;
  studyTip: string;
  fetchedAt: number;
}

const CITY_OPTIONS = [
  { key: 'seoul', label: '서울' },
  { key: 'incheon', label: '인천' },
  { key: 'suwon', label: '수원' },
  { key: 'daejeon', label: '대전' },
  { key: 'daegu', label: '대구' },
  { key: 'gwangju', label: '광주' },
  { key: 'busan', label: '부산' },
  { key: 'jeju', label: '제주' },
];

const WEATHER_CITY_STORAGE_KEY = 'gongbulog_weather_city_v1';

interface WeatherWidgetProps {
  onWeatherLoaded?: (weather: WeatherInfo) => void;
}

function renderWeatherIcon(iconKind: WeatherInfo['iconKind'], className = 'h-7 w-7') {
  switch (iconKind) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} aria-hidden="true" />;
    case 'moon':
      return <Moon className={`${className} text-indigo-400`} aria-hidden="true" />;
    case 'partly':
      return <Cloud className={`${className} text-sky-500`} aria-hidden="true" />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} aria-hidden="true" />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-sky-500`} aria-hidden="true" />;
    case 'rain':
      return <CloudRain className={`${className} text-blue-600 dark:text-blue-400`} aria-hidden="true" />;
    case 'snow':
      return <CloudSnow className={`${className} text-cyan-400`} aria-hidden="true" />;
    case 'storm':
      return <CloudLightning className={`${className} text-amber-500`} aria-hidden="true" />;
    default:
      return <Cloud className={`${className} text-slate-500`} aria-hidden="true" />;
  }
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ onWeatherLoaded }) => {
  const [cityKey, setCityKey] = useState<string>(() => {
    try {
      return localStorage.getItem(WEATHER_CITY_STORAGE_KEY) || 'seoul';
    } catch {
      return 'seoul';
    }
  });
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(
    async (opts: { city?: string; lat?: number; lon?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (typeof opts.lat === 'number' && typeof opts.lon === 'number') {
          params.set('lat', opts.lat.toFixed(4));
          params.set('lon', opts.lon.toFixed(4));
        } else {
          params.set('city', opts.city || 'seoul');
        }
        const res = await fetch(`/api/weather?${params.toString()}`);
        const data = (await res.json()) as WeatherInfo & { error?: string };
        if (!res.ok || data.error) {
          throw new Error(data.error || '날씨 정보를 불러오지 못했습니다.');
        }
        setWeather(data);
        onWeatherLoaded?.(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '날씨 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    },
    [onWeatherLoaded]
  );

  useEffect(() => {
    if (coords) {
      fetchWeather({ lat: coords.lat, lon: coords.lon });
    } else {
      fetchWeather({ city: cityKey });
    }
  }, [cityKey, coords, fetchWeather]);

  const handleSelectCity = (nextCity: string) => {
    setCoords(null);
    setCityKey(nextCity);
    try {
      localStorage.setItem(WEATHER_CITY_STORAGE_KEY, nextCity);
    } catch {
      // Ignore storage error
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setLoading(false);
        setError('위치 권한이 거부되어 선택된 도시 날씨를 표시합니다.');
      },
      { timeout: 6000 }
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            오늘의 공부 날씨
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={coords ? '' : cityKey}
            onChange={(e) => {
              if (e.target.value) handleSelectCity(e.target.value);
            }}
            aria-label="날씨 지역 선택"
            className="min-h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {coords && <option value="">내 위치</option>}
            {CITY_OPTIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUseMyLocation}
            title="현재 GPS 위치 날씨 보기"
            aria-label="현재 위치 날씨"
            className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() =>
              coords ? fetchWeather({ lat: coords.lat, lon: coords.lon }) : fetchWeather({ city: cityKey })
            }
            disabled={loading}
            title="날씨 새로고침"
            aria-label="날씨 새로고침"
            className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          {error}
        </p>
      )}

      {loading && !weather ? (
        <div className="mt-4 flex items-center justify-between gap-4 py-2">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : weather ? (
        <div className="mt-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/40">
                {renderWeatherIcon(weather.iconKind)}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                    {Math.round(weather.temperature)}°C
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {weather.condition}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                  {weather.locationName} · 체감 {Math.round(weather.feelsLike)}° · 최저{' '}
                  {Math.round(weather.tempMin)}° / 최고 {Math.round(weather.tempMax)}°
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-[11px] dark:bg-slate-800/70">
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Droplets className="h-3 w-3 text-sky-500" aria-hidden="true" />
                습도
              </span>
              <span className="mt-0.5 font-mono font-bold text-slate-800 tabular-nums dark:text-slate-100">
                {weather.humidity}%
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <CloudRain className="h-3 w-3 text-indigo-500" aria-hidden="true" />
                강수확률
              </span>
              <span className="mt-0.5 font-mono font-bold text-slate-800 tabular-nums dark:text-slate-100">
                {weather.precipProb}%
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Wind className="h-3 w-3 text-teal-500" aria-hidden="true" />
                바람
              </span>
              <span className="mt-0.5 font-mono font-bold text-slate-800 tabular-nums dark:text-slate-100">
                {weather.windSpeed.toFixed(1)}m/s
              </span>
            </div>
          </div>

          <p className="mt-2.5 rounded-xl bg-sky-50/80 px-3 py-2 text-[11px] leading-relaxed font-medium text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            {weather.studyTip}
          </p>
        </div>
      ) : null}
    </div>
  );
};

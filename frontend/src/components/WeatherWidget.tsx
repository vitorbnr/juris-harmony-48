import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";

type WeatherState = {
  temperature: number;
  weathercode: number;
};

type OpenMeteoResponse = {
  current_weather?: {
    temperature?: number;
    weathercode?: number;
  };
};

type UnitLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

const CARINHANHA_LOCATION: UnitLocation = {
  label: "Carinhanha",
  latitude: -14.3046,
  longitude: -43.765,
};

const COCOS_LOCATION: UnitLocation = {
  label: "Cocos",
  latitude: -14.1833,
  longitude: -44.5333,
};

function resolveWeatherIcon(weathercode: number): LucideIcon {
  if (weathercode === 0) return Sun;
  if ([1, 2].includes(weathercode)) return CloudSun;
  if (weathercode === 3) return Cloud;
  if ([45, 48].includes(weathercode)) return CloudFog;
  if ([51, 53, 55, 56, 57].includes(weathercode)) return CloudDrizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weathercode)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(weathercode)) return CloudSnow;
  if ([95, 96, 99].includes(weathercode)) return CloudLightning;
  return Cloud;
}

function resolveUnitLocation(unitName?: string | null): UnitLocation {
  const normalizedName = unitName?.trim().toLowerCase() ?? "";

  if (normalizedName.includes("cocos")) {
    return COCOS_LOCATION;
  }

  return CARINHANHA_LOCATION;
}

export const WeatherWidget = () => {
  const { user } = useAuth();
  const { unidadeSelecionada, unidadeAtual } = useUnidade();
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [hasError, setHasError] = useState(false);

  const currentUnitName = useMemo(() => {
    if (unidadeSelecionada !== "todas") {
      return unidadeAtual?.nome ?? user?.unidadeNome ?? CARINHANHA_LOCATION.label;
    }

    return user?.unidadeNome ?? CARINHANHA_LOCATION.label;
  }, [unidadeAtual?.nome, unidadeSelecionada, user?.unidadeNome]);

  const location = useMemo(() => resolveUnitLocation(currentUnitName), [currentUnitName]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setWeather(null);
    setHasError(false);

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Weather request failed");
        }

        const data = (await response.json()) as OpenMeteoResponse;
        const currentWeather = data.current_weather;

        if (
          !currentWeather ||
          typeof currentWeather.temperature !== "number" ||
          typeof currentWeather.weathercode !== "number"
        ) {
          throw new Error("Weather payload is invalid");
        }

        if (!active) return;

        setWeather({
          temperature: currentWeather.temperature,
          weathercode: currentWeather.weathercode,
        });
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        setHasError(true);
        setWeather(null);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [location.latitude, location.longitude]);

  if (hasError || !weather) {
    return null;
  }

  const WeatherIcon = resolveWeatherIcon(weather.weathercode);

  return (
    <div
      className="flex h-9 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary shadow-sm shadow-black/5"
      title={`Clima atual em ${location.label}`}
    >
      <WeatherIcon className="h-4 w-4" />
      <span>{Math.round(weather.temperature)}°C</span>
    </div>
  );
};

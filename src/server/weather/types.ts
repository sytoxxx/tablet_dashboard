import type { WeatherSnapshot } from "@/lib/types";

export type WeatherQuery = {
  place: string;
  latitude: number;
  longitude: number;
  fallback?: WeatherSnapshot | null;
};

export interface WeatherServiceProvider {
  readonly name: string;
  getWeather(query: WeatherQuery): Promise<WeatherSnapshot>;
}

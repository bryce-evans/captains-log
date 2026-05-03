/**
 * AutoFillService — captures timestamp + GPS + weather at the start of a
 * record-creation session. All sources are non-blocking: a failure on any
 * one returns the rest of the result with the failure recorded in `errors`.
 *
 * Total budget for the whole call is bounded by `TOTAL_TIMEOUT_MS`; once
 * exceeded the remaining work aborts and we return what we have.
 */

import {
  Accuracy,
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
  type LocationObject,
} from 'expo-location';

const TOTAL_TIMEOUT_MS = 8_000;
const GPS_TIMEOUT_MS = 5_000;
const WEATHER_TIMEOUT_MS = 5_000;

export interface AutoFillLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly place?: string;
}

export interface AutoFillWeather {
  readonly tempC: number;
  readonly conditions: string;
}

export interface AutoFillError {
  readonly source: 'gps' | 'weather';
  readonly message: string;
}

export interface AutoFillResult {
  readonly timestamp: number;
  readonly location?: AutoFillLocation;
  readonly weather?: AutoFillWeather;
  readonly errors: ReadonlyArray<AutoFillError>;
}

export interface AutoFillOptions {
  readonly skipWeather?: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly weatherApiKey?: string;
  readonly now?: () => number;
}

interface OpenWeatherResponse {
  readonly main?: { readonly temp?: number };
  readonly weather?: ReadonlyArray<{ readonly main?: string; readonly description?: string }>;
  readonly name?: string;
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'unknown error';
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(describeError(err)));
      },
    );
  });
}

async function captureLocation(): Promise<AutoFillLocation> {
  const permission = await requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error(`Location permission not granted: ${permission.status}`);
  }
  const position: LocationObject = await withTimeout(
    getCurrentPositionAsync({ accuracy: Accuracy.Balanced }),
    GPS_TIMEOUT_MS,
    'GPS',
  );
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

async function captureWeather(
  location: AutoFillLocation,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<AutoFillWeather> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}` +
    `&lon=${location.longitude}&appid=${apiKey}&units=metric`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`weather request failed with status ${response.status}`);
  }
  const data = (await response.json()) as OpenWeatherResponse;
  const tempC = data.main?.temp;
  const condition = data.weather?.[0]?.main ?? data.weather?.[0]?.description;
  if (typeof tempC !== 'number' || !Number.isFinite(tempC)) {
    throw new Error('weather response missing temperature');
  }
  return {
    tempC,
    conditions: typeof condition === 'string' ? condition : 'Unknown',
  };
}

export async function autoFill(opts: AutoFillOptions = {}): Promise<AutoFillResult> {
  const now = opts.now ?? Date.now;
  const start = now();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const apiKey =
    opts.weatherApiKey ??
    process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ??
    process.env.OPENWEATHER_API_KEY ??
    '';

  const errors: AutoFillError[] = [];
  let location: AutoFillLocation | undefined;
  let weather: AutoFillWeather | undefined;

  const remaining = (): number => Math.max(0, TOTAL_TIMEOUT_MS - (now() - start));

  try {
    location = await withTimeout(captureLocation(), remaining(), 'autoFill total');
  } catch (err: unknown) {
    errors.push({ source: 'gps', message: describeError(err) });
  }

  if (!opts.skipWeather && location && remaining() > 0) {
    if (!apiKey) {
      errors.push({ source: 'weather', message: 'weather API key not configured' });
    } else {
      try {
        weather = await withTimeout(
          captureWeather(location, apiKey, fetchImpl),
          remaining(),
          'autoFill total',
        );
      } catch (err: unknown) {
        errors.push({ source: 'weather', message: describeError(err) });
      }
    }
  }

  const result: AutoFillResult = Object.freeze({
    timestamp: start,
    ...(location ? { location } : {}),
    ...(weather ? { weather } : {}),
    errors: Object.freeze([...errors]),
  });
  return result;
}

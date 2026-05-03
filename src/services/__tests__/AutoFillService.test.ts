import * as Location from 'expo-location';

import { autoFill } from '../AutoFillService';

const mockedLocation = Location as unknown as {
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};

function makeFetch(response: Partial<Response> & { jsonValue?: unknown }): jest.Mock {
  return jest.fn(async () =>
    Object.assign(
      {
        ok: true,
        status: 200,
        json: async () => response.jsonValue,
      },
      response,
    ),
  );
}

describe('autoFill', () => {
  beforeEach(() => {
    mockedLocation.requestForegroundPermissionsAsync.mockReset();
    mockedLocation.getCurrentPositionAsync.mockReset();
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 47.61, longitude: -122.33, accuracy: 1 },
    });
  });

  it('returns timestamp, location, and weather on the happy path', async () => {
    const fetchImpl = makeFetch({
      ok: true,
      jsonValue: {
        main: { temp: 18.5 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        name: 'Seattle',
      },
    });

    const result = await autoFill({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      weatherApiKey: 'test-key',
      now: () => 1_700_000_000_000,
    });

    expect(result.timestamp).toBe(1_700_000_000_000);
    expect(result.location).toEqual({ latitude: 47.61, longitude: -122.33 });
    expect(result.weather).toEqual({ tempC: 18.5, conditions: 'Clear' });
    expect(result.errors).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calledUrl = fetchImpl.mock.calls[0]?.[0];
    expect(calledUrl).toContain('lat=47.61');
    expect(calledUrl).toContain('lon=-122.33');
    expect(calledUrl).toContain('appid=test-key');
    expect(calledUrl).toContain('units=metric');
  });

  it('returns location-less result when GPS permission is denied', async () => {
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const fetchImpl = makeFetch({ ok: true, jsonValue: {} });

    const result = await autoFill({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      weatherApiKey: 'test-key',
    });

    expect(result.location).toBeUndefined();
    expect(result.weather).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.source).toBe('gps');
  });

  it('returns weather-less result when the weather request fails', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network down');
    });

    const result = await autoFill({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      weatherApiKey: 'test-key',
    });

    expect(result.location).toBeDefined();
    expect(result.weather).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.source).toBe('weather');
    expect(result.errors[0]?.message).toMatch(/network/i);
  });

  it('skips weather when skipWeather is true', async () => {
    const fetchImpl = jest.fn();
    const result = await autoFill({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      weatherApiKey: 'test-key',
      skipWeather: true,
    });
    expect(result.location).toBeDefined();
    expect(result.weather).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.errors).toEqual([]);
  });

  it('records an error when no weather API key is configured', async () => {
    const fetchImpl = jest.fn();
    const previousPublic = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    const previousServer = process.env.OPENWEATHER_API_KEY;
    delete process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    delete process.env.OPENWEATHER_API_KEY;
    try {
      const result = await autoFill({ fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.weather).toBeUndefined();
      expect(result.errors.some((e) => e.source === 'weather')).toBe(true);
    } finally {
      if (previousPublic !== undefined) {
        process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY = previousPublic;
      }
      if (previousServer !== undefined) {
        process.env.OPENWEATHER_API_KEY = previousServer;
      }
    }
  });
});

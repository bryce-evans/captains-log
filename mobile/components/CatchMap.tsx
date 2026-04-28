import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../theme';
import { useStore, Record } from '../store';

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'CaptainsLogApp/1.0' } }
    );
    const data = await res.json();
    const result = data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    geocodeCache.set(location, result);
    return result;
  } catch {
    geocodeCache.set(location, null);
    return null;
  }
}

interface Pin {
  location: string;
  lat: number;
  lng: number;
  records: Record[];
}

export default function CatchMap() {
  const router = useRouter();
  const records = useStore((s) => s.records);
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPins() {
      const byLocation = new Map<string, Record[]>();
      for (const r of records) {
        const loc = r.fields['location'];
        if (!loc) continue;
        if (!byLocation.has(loc)) byLocation.set(loc, []);
        byLocation.get(loc)!.push(r);
      }
      const results: Pin[] = [];
      for (const [location, recs] of byLocation) {
        const coords = await geocode(location);
        if (coords && !cancelled) results.push({ location, lat: coords.lat, lng: coords.lng, records: recs });
      }
      if (!cancelled) setPins(results);
    }
    loadPins();
    return () => { cancelled = true; };
  }, [records]);

  const initialRegion = pins.length > 0
    ? {
        latitude: pins.reduce((s, p) => s + p.lat, 0) / pins.length,
        longitude: pins.reduce((s, p) => s + p.lng, 0) / pins.length,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }
    : { latitude: 42.7, longitude: -76.7, latitudeDelta: 1.2, longitudeDelta: 1.2 };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {pins.map((pin) => (
          <Marker key={pin.location} coordinate={{ latitude: pin.lat, longitude: pin.lng }}>
            <View style={styles.markerWrap}>
              <Text style={styles.markerEmoji}>🎣</Text>
              {pin.records.length > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pin.records.length}</Text>
                </View>
              )}
            </View>
            <Callout onPress={() => router.push(`/record/${pin.records[0].id}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutLocation}>{pin.location}</Text>
                {pin.records.map((r) => {
                  const species = r.fields['species'] ?? r.schemaName;
                  const weight = r.fields['weight_lbs'];
                  const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <View key={r.id} style={styles.calloutRow}>
                      <Text style={styles.calloutSpecies}>{species}</Text>
                      <Text style={styles.calloutMeta}>{weight ? `${weight} lbs · ` : ''}{date}</Text>
                    </View>
                  );
                })}
                {pin.records.length === 1 && <Text style={styles.calloutTap}>Tap to view →</Text>}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {pins.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyText}>Log catches with a location to see them here</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerWrap: { alignItems: 'center' },
  markerEmoji: { fontSize: 28 },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.primary, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontFamily: Fonts.bodyBold },
  callout: { width: 200, padding: 10 },
  calloutLocation: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.primary, marginBottom: 6 },
  calloutRow: { marginBottom: 4 },
  calloutSpecies: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.textPrimary },
  calloutMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  calloutTap: { fontFamily: Fonts.body, fontSize: 11, color: Colors.primary, marginTop: 4 },
  emptyOverlay: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});

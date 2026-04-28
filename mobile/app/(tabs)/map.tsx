import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../../theme';
import { useStore, Record } from '../../store';
import { getSpeciesImage } from '../../assets/species';

// Geocode cache — avoids re-fetching across renders
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CaptainsLogApp/1.0' } });
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

function WebFallback() {
  return (
    <SafeAreaView style={styles.center} edges={['bottom']}>
      <Text style={styles.webIcon}>🗺️</Text>
      <Text style={styles.webTitle}>Map view</Text>
      <Text style={styles.webSub}>Available in the native app</Text>
    </SafeAreaView>
  );
}

export default function MapScreen() {
  if (Platform.OS === 'web') return <WebFallback />;

  // Dynamic import — keeps web bundle clean
  const MapView = require('react-native-maps').default;
  const { Marker, Callout } = require('react-native-maps');

  const router = useRouter();
  const records = useStore((s) => s.records);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPins() {
      // Collect unique locations from all records
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
        if (coords && !cancelled) {
          results.push({ location, lat: coords.lat, lng: coords.lng, records: recs });
        }
      }
      if (!cancelled) setPins(results);
    }
    loadPins();
    return () => { cancelled = true; };
  }, [records]);

  // Initial region: centroid of pins, or Finger Lakes default
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
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {pins.map((pin) => (
          <Marker
            key={pin.location}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            onPress={() => setSelectedId(pin.location === selectedId ? null : pin.location)}
          >
            {/* Custom marker */}
            <View style={styles.markerWrap}>
              <Text style={styles.markerEmoji}>🎣</Text>
              {pin.records.length > 1 && (
                <View style={styles.markerBadge}>
                  <Text style={styles.markerBadgeText}>{pin.records.length}</Text>
                </View>
              )}
            </View>

            <Callout onPress={() => {
              const first = pin.records[0];
              router.push(`/record/${first.id}`);
            }}>
              <View style={styles.callout}>
                <Text style={styles.calloutLocation}>{pin.location}</Text>
                {pin.records.map((r) => {
                  const species = r.fields['species'] ?? r.schemaName;
                  const weight = r.fields['weight_lbs'];
                  const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <View key={r.id} style={styles.calloutRow}>
                      <Text style={styles.calloutSpecies}>{species}</Text>
                      <Text style={styles.calloutMeta}>
                        {weight ? `${weight} lbs · ` : ''}{date}
                      </Text>
                    </View>
                  );
                })}
                {pin.records.length === 1 && (
                  <Text style={styles.calloutTap}>Tap to view →</Text>
                )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper },
  webIcon: { fontSize: 56, marginBottom: 12 },
  webTitle: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.textMuted },
  webSub: { fontFamily: Fonts.body, fontSize: 15, color: Colors.textMuted, marginTop: 6 },

  markerWrap: { alignItems: 'center' },
  markerEmoji: { fontSize: 28 },
  markerBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  markerBadgeText: { color: Colors.white, fontSize: 10, fontFamily: Fonts.bodyBold },

  callout: { width: 200, padding: 10 },
  calloutLocation: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.primary,
    marginBottom: 6,
  },
  calloutRow: { marginBottom: 4 },
  calloutSpecies: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.textPrimary },
  calloutMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  calloutTap: { fontFamily: Fonts.body, fontSize: 11, color: Colors.primary, marginTop: 4 },

  emptyOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});

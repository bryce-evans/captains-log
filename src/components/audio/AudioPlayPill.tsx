import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { MicroCaps } from '@/components/type';
import { color, elevation, radius, space } from '@/styles/tokens';
import { logger } from '@/utils/logger';

interface Props {
  uri: string;
}

interface SoundLike {
  unloadAsync: () => Promise<unknown>;
  playAsync: () => Promise<unknown>;
  stopAsync: () => Promise<unknown>;
  setOnPlaybackStatusUpdate: (cb: (status: unknown) => void) => void;
}

interface SoundStatus {
  isLoaded?: boolean;
  didJustFinish?: boolean;
  isPlaying?: boolean;
  error?: string;
}

/**
 * Bottom pill for record audio playback. Mist background, ink ASCII-style
 * waveform glyph, MicroCaps caption that flips between "tap to play" and
 * "playing…". Uses expo-av Audio.Sound under the hood; the sound object is
 * lazily created on first tap and torn down on unmount.
 *
 * No spinner per DESIGN.md — playback state is signaled through the
 * caption only.
 */
export function AudioPlayPill({ uri }: Props) {
  const soundRef = useRef<SoundLike | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      const current = soundRef.current;
      soundRef.current = null;
      if (current) {
        void current.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const handlePress = useCallback(async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
        return;
      }

      // Tear down a finished sound before creating a new one — avoids the
      // "already playing" warning when the user replays.
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {
          // best-effort
        }
        soundRef.current = null;
      }

      const factory = Audio as unknown as {
        Sound: { createAsync: (source: { uri: string }) => Promise<{ sound: SoundLike }> };
      };
      const { sound } = await factory.Sound.createAsync({ uri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: unknown) => {
        const s = (status ?? {}) as SoundStatus;
        if (s.didJustFinish) {
          setIsPlaying(false);
        }
      });
      await sound.playAsync();
      setIsPlaying(true);
    } catch (err) {
      logger.warn('AudioPlayPill: playback failed', err);
      setIsPlaying(false);
    }
  }, [isPlaying, uri]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Stop playback' : 'Play recorded audio'}
      onPress={() => {
        void handlePress();
      }}
      style={({ pressed }) => [styles.pill, elevation.rest, pressed ? styles.pressed : null]}
    >
      <WaveformGlyph />
      <MicroCaps style={styles.caption}>{isPlaying ? 'playing…' : 'tap to play'}</MicroCaps>
    </Pressable>
  );
}

/**
 * Static ink waveform glyph — three short bars of varying height. We
 * intentionally don't animate the bars while playing; the caption swap is
 * the entire signal. Keeps the recording-state ripple as the app's only
 * "performing" motion.
 */
function WaveformGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={[styles.bar, { height: 10 }]} />
      <View style={[styles.bar, { height: 16 }]} />
      <View style={[styles.bar, { height: 22 }]} />
      <View style={[styles.bar, { height: 14 }]} />
      <View style={[styles.bar, { height: 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.mist,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.md,
    alignSelf: 'center',
  } satisfies ViewStyle,
  pressed: {
    opacity: 0.75,
  },
  caption: {
    color: color.ink,
  },
  glyph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: color.ink,
  },
});

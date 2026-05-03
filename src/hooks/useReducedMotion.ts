import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reads `AccessibilityInfo.isReduceMotionEnabled` synchronously at mount
 * (well — kicked off synchronously; React state lands on the next tick)
 * and stays in sync via the `reduceMotionChanged` event. Components that
 * orchestrate motion should branch on this and either skip the animation
 * or replace it with a quick fade.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) {
          setReduced(value);
        }
      })
      .catch(() => {
        // Best-effort: if the platform doesn't support the query we fall
        // back to motion-on rather than blocking everything.
        if (mounted) {
          setReduced(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value: boolean) => {
        setReduced(value);
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

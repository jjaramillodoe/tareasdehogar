import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/**
 * Back navigation that still works when the screen was opened from a deep link
 * (no history): falls back to the welcome screen instead of a GO_BACK error.
 */
export function useGoBack(fallback: '/' = '/') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}

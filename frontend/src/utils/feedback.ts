import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function webVibrate(pattern: number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function playWebTone(freq: number, durationMs: number, type: OscillatorType = 'sine') {
  try {
    const AC =
      typeof window !== 'undefined'
        ? (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
            .AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02);
    setTimeout(() => {
      void ctx.close();
    }, durationMs + 80);
  } catch {
    // Web Audio not available
  }
}

/** Aprobar tarea: [50, 40, 80] */
export async function hapticApprove() {
  if (Platform.OS === 'web') {
    webVibrate([50, 40, 80]);
    playWebTone(660, 90);
    setTimeout(() => playWebTone(880, 110), 90);
    return;
  }
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // device without haptics
  }
}

/** Subir racha: [40, 30, 60, 40, 100] */
export async function hapticStreak() {
  if (Platform.OS === 'web') {
    webVibrate([40, 30, 60, 40, 100]);
    playWebTone(520, 80);
    setTimeout(() => playWebTone(740, 90), 80);
    setTimeout(() => playWebTone(980, 140), 170);
    return;
  }
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // device without haptics
  }
}

export async function hapticTap() {
  if (Platform.OS === 'web') {
    webVibrate([12]);
    return;
  }
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore
  }
}

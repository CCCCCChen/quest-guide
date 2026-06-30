// EXPORTS: playSound, SoundType

import { useSettings } from '@/hooks/useSettings';

export type SoundType = 'complete' | 'click' | 'levelup' | 'error' | 'redeem';

// 使用 Web Audio API 生成简单音效，无需外部音频文件
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine') {
  frequencies.forEach((freq, i) => {
    setTimeout(() => playTone(freq, duration, type, 0.1), i * 80);
  });
}

export function playSound(type: SoundType) {
  // 从 localStorage 直接读取设置（避免 hook 依赖）
  try {
    const stored = localStorage.getItem('__quest_guild_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.soundEnabled === false) return;
    }
  } catch {
    // 默认开启
  }

  switch (type) {
    case 'complete':
      playChord([523.25, 659.25, 783.99], 0.2, 'sine');
      break;
    case 'click':
      playTone(800, 0.05, 'square', 0.08);
      break;
    case 'levelup':
      playChord([440, 554.37, 659.25, 880], 0.25, 'triangle');
      break;
    case 'error':
      playTone(200, 0.15, 'sawtooth', 0.1);
      break;
    case 'redeem':
      playChord([659.25, 783.99, 1046.5], 0.18, 'sine');
      break;
  }
}

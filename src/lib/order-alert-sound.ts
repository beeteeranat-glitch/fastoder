let audioContext: AudioContext | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let isLooping = false;

function getAudioContextClass() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

/** ต้องเรียกใน event handler ของผู้ใช้ (คลิก/แตะ) โดยตรง ห้าม await */
export function unlockOrderAlertAudio() {
  if (typeof window === "undefined") return;

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

function playBeep(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

export function playNewOrderAlert() {
  if (typeof window === "undefined") return;

  unlockOrderAlertAudio();
  if (!audioContext) return;

  const ctx = audioContext;
  const now = ctx.currentTime;

  for (let round = 0; round < 4; round += 1) {
    const base = now + round * 0.5;
    playBeep(ctx, 784, base, 0.22, 1);
    playBeep(ctx, 1046, base + 0.24, 0.22, 1);
    playBeep(ctx, 1318, base + 0.48, 0.28, 1);
  }
}

export function startOrderAlertLoop() {
  if (typeof window === "undefined" || isLooping) return;

  isLooping = true;
  unlockOrderAlertAudio();
  playNewOrderAlert();

  loopTimer = setInterval(() => {
    playNewOrderAlert();
  }, 2_800);
}

export function stopOrderAlertLoop() {
  isLooping = false;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}

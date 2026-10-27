// Adapted from predict-voice-quality, MIT, Copyright (c) 2026 Akhil Vydyula.
// Pinned 78e30f766efde6c8c66d9e5a47441b44312d216c; notice: licenses/PREDICT-VOICE-QUALITY-MIT.txt.
// Changes: bounded PCM/rate validation; AC level gate; quiet input requires stronger periodicity confidence.
const MIN_FREQUENCY = 80;
const MAX_FREQUENCY = 1e3;
const YIN_THRESHOLD = 0.15;
function computeRms(samples) {
  let sum = 0, mean = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
    mean += samples[i];
  }
  // A microphone's DC offset must not lift inaudible periodic noise over the level gate.
  return Math.sqrt(Math.max(0, sum / samples.length - (mean / samples.length) ** 2));
}
function detectPitch(samples, sampleRate) {
  if (!(samples instanceof Float32Array) || samples.length < 512 || samples.length > 8192 || !Number.isFinite(sampleRate) || sampleRate < 8e3 || sampleRate > 192e3) {
    return null;
  }
  if (!samples.every((v) => Number.isFinite(v) && Math.abs(v) <= 1)) return null;
  const rms = computeRms(samples);
  if (rms < 0.003) {
    return null;
  }
  const minTau = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxTau = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), Math.floor(samples.length / 2));
  if (maxTau <= minTau) {
    return null;
  }
  const yinBuffer = new Float32Array(maxTau + 1);
  yinBuffer[0] = 1;
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    const start = Math.floor((maxTau - tau) / 2);
    for (let i = 0; i < samples.length - maxTau; i++) {
      const delta = samples[start + i] - samples[start + i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum > 0 ? yinBuffer[tau] * tau / runningSum : 1;
  }
  let bestTau = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (yinBuffer[tau] < YIN_THRESHOLD) {
      while (tau + 1 <= maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }
  if (bestTau === -1) {
    let minVal = Infinity;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        bestTau = tau;
      }
    }
    if (minVal > 0.4) {
      return null;
    }
  }
  const prev = yinBuffer[Math.max(bestTau - 1, 0)];
  const next = yinBuffer[Math.min(bestTau + 1, maxTau)];
  const current = yinBuffer[bestTau];
  const refinedTau = bestTau + (next - prev) / (2 * (2 * current - next - prev) || 1);
  const frequency = sampleRate / refinedTau;
  const confidence = Math.max(0, Math.min(1, 1 - current));
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return null;
  }
  return { frequency, confidence, rms };
}
export {
  detectPitch
};

// Low-level input must be more periodic; never normalize room noise into a voice.
export function isSingingPitch(pitch) {
  return !!pitch && Number.isFinite(pitch.frequency) && pitch.frequency >= 80 && pitch.frequency <= 1000
    && Number.isFinite(pitch.rms) && pitch.rms >= .003 && pitch.rms <= 1
    && Number.isFinite(pitch.confidence) && pitch.confidence >= (pitch.rms < .01 ? .95 : .9) && pitch.confidence <= 1;
}

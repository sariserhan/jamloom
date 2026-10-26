import {SessionTransport} from './session-transport.js';

export const stemParts = ['drums', 'bass', 'other', 'vocals'];

export function validateStemPlan(plan, buffers) {
  if (!plan || !Number.isFinite(plan.seconds) || plan.seconds < 180 || plan.seconds > 300 ||
      !Number.isFinite(plan.bpm) || plan.bpm < 90 || plan.bpm > 160 ||
      !Array.isArray(plan.events) || !plan.events.length || plan.events.length > 256)
    throw Error('Invalid bounded stem performance');
  for (const event of plan.events) {
    const buffer = buffers[event.clip];
    if (!stemParts.includes(event.part) || !buffer || !Number.isFinite(buffer.duration) ||
        buffer.duration < .2 || buffer.duration > 16 || buffer.numberOfChannels !== 2 ||
        !Number.isFinite(event.at) || event.at < 0 || event.at + buffer.duration > plan.seconds + .001 ||
        !Number.isFinite(event.gain) || event.gain < 0 || event.gain > 1)
      throw Error('Invalid stem event');
  }
  for (const part of stemParts) {
    let end = 0;
    for (const event of plan.events.filter(e => e.part === part).sort((a,b) => a.at-b.at)) {
      if (event.at < end - .001) throw Error('Overlapping voices on a stem');
      end = event.at + buffers[event.clip].duration;
    }
  }
}

// Local arrangement study: existing transport and mixer, no second audio clock.
export function scheduleStemPerformance(context, mixer, plan, buffers, frame) {
  validateStemPlan(plan, buffers);
  if (!Number.isInteger(frame) || frame < Math.ceil(context.currentTime * context.sampleRate))
    throw Error('Performance start has passed');
  const transport = new SessionTransport(context), voices = new Set();
  const destinations = {drums:mixer.strips[0].input, bass:mixer.strips[1].input,
    other:mixer.rackFX.input, vocals:mixer.performanceFX.input};
  const origin = frame / context.sampleRate;
  let stopped = false;
  try {
    for (const event of plan.events) {
      const buffer = buffers[event.clip], time = origin + event.at;
      const voice = transport.play(buffer, destinations[event.part],
        frame + Math.round(event.at * context.sampleRate), v => voices.delete(v));
      voices.add(voice);
      const end = time + buffer.duration, gain = voice.gain.gain;
      gain.cancelScheduledValues(time);
      gain.setValueAtTime(0, time); gain.linearRampToValueAtTime(event.gain, time + .005);
      const final = Math.abs(event.at + buffer.duration - plan.seconds) < .001;
      gain.setValueAtTime(event.gain, end - (final ? Math.min(2, buffer.duration/2) : .005));
      gain.linearRampToValueAtTime(0, end);
    }
  } catch (error) { for (const voice of voices) transport.release(voice); throw error; }
  return {
    stop() { if (stopped) return; stopped = true; for (const voice of voices) transport.release(voice); },
    snapshot() {
      const seconds = Math.max(0, context.currentTime - origin);
      return {seconds, ended:stopped || seconds >= plan.seconds,
        active:stopped || context.currentTime < origin ? [] : plan.events.filter(e => seconds >= e.at && seconds < e.at + buffers[e.clip].duration)
          .map(e => ({...e, position:seconds-e.at, duration:buffers[e.clip].duration}))};
    },
  };
}

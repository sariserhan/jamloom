import {SessionTransport} from './session-transport.js';

export const stemParts = ['drums', 'bass', 'other', 'vocals'];

export function validateStemPlan(plan, buffers) {
  if (!plan || !Number.isFinite(plan.seconds) || plan.seconds < 4 || plan.seconds > 300 ||
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
export function scheduleStemPerformance(context, mixer, plan, buffers, frame, continuing = false) {
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
      const final = !continuing && Math.abs(event.at + buffer.duration - plan.seconds) < .001;
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

// Qualification only: consecutive delivered parts reuse the same clock and mixer.
export function createStemSequence(context, mixer, frame) {
  if (!Number.isInteger(frame) || frame < Math.ceil(context.currentTime * context.sampleRate))
    throw Error('Performance start has passed');
  let nextFrame = frame, sequence = 0, bpm, contextId, stopped = false, finishing = false;
  const queued = [];
  const prune = () => { while (queued.length && queued[0].end <= context.currentTime) queued.shift(); };
  return {
    enqueue(plan, buffers) {
      prune();
      if (stopped || finishing || queued.length >= 2) throw Error('Stem sequence stopped or buffer full');
      validateStemPlan(plan, buffers);
      if (plan.sequence !== sequence || plan.seconds > 60 || plan.events.length > 64 ||
          !/^[a-f0-9]{64}$/.test(plan.contextId) ||
          (sequence && (plan.bpm !== bpm || plan.contextId !== contextId)))
        throw Error('Stem sequence requires ordered, tempo and context compatible parts');
      // A prompt alone cannot guarantee continuity; require complete delivered rhythm parts.
      for (const part of ['drums', 'bass']) {
        let end = 0;
        for (const event of plan.events.filter(e => e.part === part).sort((a,b) => a.at-b.at)) {
          if (Math.abs(event.at-end) > 1/context.sampleRate) throw Error('Missing rhythm coverage');
          end = event.at + buffers[event.clip].duration;
        }
        if (Math.abs(end-plan.seconds) > 1/context.sampleRate) throw Error('Missing rhythm coverage');
      }
      if (plan.final !== undefined && typeof plan.final !== 'boolean') throw Error('Invalid sequence ending');
      const performance = scheduleStemPerformance(context, mixer, plan, buffers, nextFrame, !plan.final);
      nextFrame += Math.round(plan.seconds * context.sampleRate);
      queued.push({performance, end:nextFrame/context.sampleRate});
      bpm = plan.bpm; contextId = plan.contextId; finishing = plan.final === true; sequence++;
    },
    snapshot() {
      prune();
      return {sequence, seconds:Math.max(0,context.currentTime-frame/context.sampleRate), buffered:queued.length, ended:stopped || !queued.length,
        active:stopped ? [] : queued.flatMap(q => q.performance.snapshot().active)};
    },
    stop() { stopped = true; for (const q of queued) q.performance.stop(); queued.length = 0; },
  };
}

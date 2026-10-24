// An explicit annotation is evidence of intent; an idle interval alone is not.
export function mixIntent(events, receipt, transport) {
  if (!Array.isArray(events) || events.length > 128 || !transport ||
      transport.wav_sha256 !== receipt.wav_sha256 || transport.sample_rate !== receipt.sample_rate)
    throw Error('Incomplete demonstration context');
  let previous = receipt.observed_context_start_frame;
  for (const event of events) {
    const observed = transport.events[event.transport_event_index];
    if (!event || Object.keys(event).sort().join(',') !== 'context_frame,kind,reason,transport_event_index' ||
        !['hold', 'action_reason'].includes(event.kind) || typeof event.reason !== 'string' ||
        !event.reason.trim() || event.reason.length > 240 ||
        !Number.isSafeInteger(event.transport_event_index) || event.transport_event_index < 0 ||
        !Number.isSafeInteger(event.context_frame) || event.context_frame < previous ||
        event.context_frame >= receipt.observed_context_start_frame + receipt.frames ||
        observed?.context_frame !== event.context_frame || observed.action !== 'snapshot')
      throw Error('Invalid demonstration intent');
    previous = event.context_frame;
  }
  return { schema_version: '1.0-dj-intent', origin: 'unreviewed_live_capture',
    training_authorized: false, expert_verified: false, wav_sha256: receipt.wav_sha256,
    sample_rate: receipt.sample_rate, observed_context_start_frame: receipt.observed_context_start_frame,
    events: structuredClone(events) };
}

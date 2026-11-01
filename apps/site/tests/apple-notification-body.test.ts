import test from 'node:test';
import assert from 'node:assert/strict';
import {appleNotificationRequest} from '../lib/apple-notification-body';
import {boundedAuthRequest} from '../lib/bounded-request';

test('subscription notification envelopes exceed account form sizes without losing their signature bytes',async()=>{
 const body=JSON.stringify({signedPayload:'x'.repeat(19000)});
 const request=()=>new Request('https://www.jamloom.com/api/payments/apple/notifications/sandbox',{method:'POST',body});
 assert.equal(await boundedAuthRequest(request()),null,'Account form bounds stay unchanged');
 const accepted=await appleNotificationRequest(request());assert(accepted);
 assert.equal(await accepted.text(),body,'Signature bytes must remain unchanged for verification');
});
test('Apple notification streams remain bounded even without a trustworthy content length',async()=>{
 let cancelled=false;
 const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(8192));},cancel(){cancelled=true;}});
 const request=new Request('https://www.jamloom.com/api/payments/apple/notifications',{method:'POST',headers:{'Content-Length':'1'},body:stream,duplex:'half'} as RequestInit);
 assert.equal(await appleNotificationRequest(request),null);assert(cancelled);
});

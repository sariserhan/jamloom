import {boundedAuthRequest} from './bounded-request';
// Subscription notifications nest transaction and renewal JWS certificates;
// real deliveries exceed the smaller account-form limit (about 19 KB).
export const appleNotificationRequest=(request:Request)=>boundedAuthRequest(request,64*1024);

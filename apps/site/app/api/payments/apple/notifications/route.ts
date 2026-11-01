import {appleNotificationPOST} from '../../../../../lib/apple-notification-http';
export const runtime='nodejs';
export async function POST(request:Request){return appleNotificationPOST(request);}

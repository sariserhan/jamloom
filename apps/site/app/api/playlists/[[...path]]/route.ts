import {listeningLibraryRequest} from '../../../../lib/listening-library-http';
export const runtime='nodejs';
type Context={params:Promise<{path?:string[]}>};
async function handle(request:Request,context:Context){return listeningLibraryRequest(request,(await context.params).path);}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;

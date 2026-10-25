import {listeningLibraryRequest} from '../../../lib/listening-library-http';
export const runtime='nodejs';
export const GET=(request:Request)=>listeningLibraryRequest(request,[],true);
export const POST=GET;
export const DELETE=GET;

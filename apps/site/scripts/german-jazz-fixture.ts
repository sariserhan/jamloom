// Offline validation for an explicitly approved reproduction; never a customer input.
export function germanJazzFixture(value:unknown){
 const v=value as Record<string,unknown>;
 if(!v||typeof v!=='object'||Array.isArray(v)||v.version!==1||
  !Number.isSafeInteger(v.seed)||Number(v.seed)<0||Number(v.seed)>0xffffffff||
  !Number.isSafeInteger(v.seconds)||Number(v.seconds)<100||Number(v.seconds)>140||
  v.reference!=='Take Five — Dave Brubeck'||v.genre!=='Jazz'||v.language!=='de'||
  typeof v.failedJobId!=='string'||!/^[a-f0-9]{32}$/.test(v.failedJobId)||
  typeof v.sourceProofPath!=='string'||!/^docs\/evidence\/[A-Za-z0-9_./-]+\.json$/.test(v.sourceProofPath)||v.sourceProofPath.split('/').includes('..')||
  typeof v.sourceProofSHA256!=='string'||!/^[a-f0-9]{64}$/.test(v.sourceProofSHA256))
  throw Error('Use a receipt-bound German Jazz diagnostic fixture');
 return {seed:Number(v.seed),seconds:Number(v.seconds),reference:v.reference,genre:v.genre,language:v.language,
  failedJobId:v.failedJobId,sourceProofPath:v.sourceProofPath,sourceProofSHA256:v.sourceProofSHA256};
}
export function verifyGermanJazzReceipt(fixture:ReturnType<typeof germanJazzFixture>,proof:any){
 const row=proof?.requests?.find((r:any)=>r?.id===fixture.failedJobId);
 if(proof?.status!=='FAIL'||row?.product!=='music-dna'||row.state!=='failed'||row.providerStatus!=='FAILED'||
  row.failedSeed!==fixture.seed||row.durationSeconds!==fixture.seconds||!/^style-rejected(?::matched-[0-4]-of-4)?$/.test(row.failure??''))
  throw Error('Diagnostic fixture differs from the failed provider receipt');
}

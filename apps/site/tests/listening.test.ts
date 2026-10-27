import test from 'node:test';import assert from 'node:assert/strict';
import {audioURL,readFavorites,songTrack,coverHue,publicCredit} from '../lib/listening';
import {validateFeedback} from '../lib/dna-feedback-schema';
import {publicSongRead,comingSoonRecovery} from '../lib/coming-soon';
const id='a'.repeat(32),track={id,title:'A song',artist:'Public credit'};
test('listening permits only exact audio routes and preserves explicit public product links',()=>{
 for(const kind of ['music-dna','improvise']){const t=songTrack(track,kind);assert.equal(audioURL(t),t.url);assert.equal(t.href,`/listen/${kind}/${id}`);}
 for(const url of ['https://evil.test/a','//evil.test/a','/api/taste/song?id='+id+'&file=input','/api/ai-dj/recordings/'+id+'/audio','/api/taste/song?id='+id+'&file=audio&owner=x'])assert.equal(audioURL({...track,url}),'/api/catalogue/'+id+'/audio');
 assert.equal(audioURL({...track,url:'/api/ai-dj/sets/'+id+'/audio'}),'/api/ai-dj/sets/'+id+'/audio');
 assert.equal(coverHue(id),coverHue(id));assert.ok(coverHue(id)>=0&&coverHue(id)<360);
});
test('corrupted or malicious favorite storage cannot create external navigation',()=>{
 assert.deepEqual(readFavorites('not json'),[]);assert.deepEqual(readFavorites('{}'),[]);assert.deepEqual(readFavorites(JSON.stringify([{...track,href:'https://evil.test'},{id:12},{...track,title:'x'.repeat(201)}])),[]);
 assert.equal(readFavorites(JSON.stringify([songTrack(track)]))[0].id,id);assert.equal(readFavorites(JSON.stringify(Array(501).fill(track))).length,500);
});
test('moment feedback is optional, bounded and retains consent requirements',()=>{
 const feedback={rating:'dislike',tags:['weak_opening','awkward_transition'],personalize:false,trainingConsent:false};
 assert.deepEqual(validateFeedback(feedback),feedback);assert.equal(validateFeedback({...feedback,momentSeconds:35.4}).momentSeconds,35);
 for(const momentSeconds of [-1,Infinity,NaN,36001,'30'])assert.throws(()=>validateFeedback({...feedback,momentSeconds}));
 assert.throws(()=>validateFeedback({...feedback,trainingConsent:undefined}));
});
test('published discovery does not open generation, private collections or review actions',()=>{
 for(const path of ['/','/start','/community','/tour','/listen/music-dna/'+id,'/creators/Public%20credit','/catalogue/'+id])assert.equal(comingSoonRecovery(path),true);
 for(const path of ['/api/generations','/api/taste/song','/api/ai-dj/sessions','/api/catalogue/review'])assert.equal(comingSoonRecovery(path),false);
 assert.equal(publicSongRead(new Request('https://www.jamloom.com/api/catalogue')),true);
 for(const url of ['/api/catalogue/review','/api/catalogue?owner=x','/api/catalogue/'+id+'/review-audio'])assert.equal(publicSongRead(new Request('https://www.jamloom.com'+url)),false);
 assert.equal(publicSongRead(new Request('https://www.jamloom.com/api/catalogue',{method:'POST'})),false);
});

test('public credits decode once and reject malformed or unsafe route text',()=>{assert.equal(publicCredit('Chosen%20credit'),'Chosen credit');assert.equal(publicCredit('100%25%20Original'),'100% Original');assert.equal(publicCredit('%2520'),'%20');for(const value of ['%xx','%00','%20','a'.repeat(81)])assert.equal(publicCredit(value),null);});

test('discovery stays inside public candidates, respects dislikes, and introduces new styles',async()=>{
 const {discoverTracks}=await import('../lib/listening');
 const make=(id:string,mood:string,created='2026-10-27')=>({id,title:id,artist:'Creator',kind:'music-dna',mood,created});
 const saved=make('saved','house'),privateFavorite=make('private','house'),a=make('a','house'),b=make('b','house'),c=make('c','house'),fresh=make('fresh','jazz'),bad=make('bad','house');
 const publicTracks=[saved,a,b,c,fresh,bad],before=JSON.stringify(publicTracks);
 assert.deepEqual(discoverTracks(publicTracks,[saved,privateFavorite],[{kind:'music-dna',id:'bad',rating:'dislike'}]).map(t=>t.id),['a','b','fresh','c']);assert.equal(JSON.stringify(publicTracks),before);
 assert.equal(discoverTracks([a,fresh],[],[{kind:'music-dna',id:'fresh',rating:'like'}])[0].id,'fresh');
 assert.deepEqual(discoverTracks([], [privateFavorite]),[]);
});

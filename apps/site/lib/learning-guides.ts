export type LearningGuide={title:string;description:string;paragraphs:readonly string[];sections?:readonly {heading:string;paragraphs:readonly string[]}[];related?:readonly string[];workspace?:{href:string;label:string};updated?:string};
export const creationGuides:Record<string,LearningGuide>={
 'ai-song-generator-from-favorite-artists':{
  title:'AI song generator from your favorite artists: how it works',
  description:'Make an original AI song with vocals from the artists and songs you already love. No prompt writing: pick favorites, press Generate once and get an email when your song is ready.',
  updated:'2026-11-16',paragraphs:['Most AI song generators ask you to describe a song in words. Jamloom Music DNA starts from something easier: the music you already listen to. You pick a few favorite artists or songs, and Jamloom writes and sings an original song inspired by their style, in the language you choose.'],
  sections:[
   {heading:'1. Pick a few favorites that share a feeling',paragraphs:['Search for artists or songs, or bring a YouTube playlist. Three to five favorites that share a mood, tempo or sound usually give a more focused song than a long mixed list. Each search result shows its genre, so you can tell similarly named artists apart.']},
   {heading:'2. Press Generate once',paragraphs:['Choose a singing language and whether the song is public or private, then press Generate. There is nothing else to wait for on the page: Jamloom starts the music studio if needed, writes lyrics, composes and sings your song. A progress bar follows you around the site, and we email you when it is ready.']},
   {heading:'3. Listen, download or share',paragraphs:['Your song is about two minutes long with AI vocals. It is inspired by your favorites, not a copy of any recording, melody or singer. Keep it private, or make it public to appear in Community and get a shareable page with a vertical video for TikTok, Reels and Shorts.']},
   {heading:'What it costs',paragraphs:['A public Music DNA song costs 20 credits and a private one 25. 150 credits cost $20, and the Creator plan gives 300 credits a month for $35. Credits never expire, and a song that fails returns its credits. New accounts can claim a free first song while places last.']},
  ],
  related:['make-a-song-from-favorite-music','ai-song-in-your-language','ai-music-credits'],workspace:{href:'/music-dna',label:'Make your song with Music DNA'}
 },
 'make-a-birthday-song-with-ai':{
  title:'How to make a personal birthday song with AI',
  description:'Create an original birthday song for a friend or family member: start from the music they love or from a recorded message, choose their language and share the finished song.',
  updated:'2026-11-16',paragraphs:['A song made from someone’s favorite music is a more personal gift than a generic birthday tune. Jamloom gives you two ways to make one, and both take a single press of Generate.'],
  sections:[
   {heading:'Option 1: start from their favorite artists',paragraphs:['Open Music DNA and add three to five artists or songs the birthday person loves. Choose the language they speak best, then press Generate. You get an original two-minute song with AI vocals in a style they will recognise.']},
   {heading:'Option 2: start from your own recorded message',paragraphs:['Open Improvise and record a short message, a hum or a beat. Jamloom builds a 30–45 second arrangement around your recording, so your own voice or sound is part of the song.']},
   {heading:'Share it on the day',paragraphs:['Download the song, or make it public to get a song page and a vertical video you can post or send. Private songs stay visible only to you, so you can listen first and decide.']},
  ],
  related:['ai-song-generator-from-favorite-artists','record-sound-for-ai-song'],workspace:{href:'/music-dna',label:'Make a birthday song'}
 },
 'ai-song-in-your-language':{
  title:'Make an AI song in Spanish, Turkish, Arabic or 47 other languages',
  description:'Jamloom Music DNA sings original AI songs in 50 languages. Pick favorite artists from any country, choose the singing language and press Generate once.',
  updated:'2026-11-16',paragraphs:['You do not need English lyrics to make an AI song. Jamloom Music DNA can write and sing an original song in 50 languages, including Spanish, Turkish, Arabic, Hindi, French, German, Japanese, Korean, Portuguese and Italian.'],
  sections:[
   {heading:'1. Choose favorites and a singing language',paragraphs:['Add favorite artists or songs from any country, then pick the singing language. Choose it explicitly when it matters: the automatic setting guesses from your favorites and is not always right.']},
   {heading:'2. Press Generate once',paragraphs:['Jamloom writes lyrics in your chosen language and sings them over an original arrangement inspired by your favorites. You can browse or close the page; we email you when the song is ready.']},
   {heading:'Tips for better results',paragraphs:['Favorites that already use the language you choose often give a more natural feel. If a result is not quite right, a new variation is a new generation, so you can try a different set of favorites.']},
  ],
  related:['ai-song-generator-from-favorite-artists','make-a-song-from-favorite-music'],workspace:{href:'/music-dna',label:'Make a song in your language'}
 },
 'make-a-song-from-favorite-music':{
  title:'How to make a song inspired by your favorite music',
  description:'Turn favorite songs and artists into a starting point for an original AI song. Choose a language, review the direction and create with Jamloom Music DNA.',
  updated:'2026-11-09',paragraphs:['Your favorite music can help describe a direction without becoming the audio in your new song. Jamloom Music DNA uses reviewed song and artist names, catalogue metadata and your language choice to guide an original arrangement with AI singing. It does not download or sample the recordings in your favorites.'],
  sections:[
   {heading:'1. Choose a small, purposeful set of favorites',paragraphs:['Open Music DNA and search for songs or artists. Add choices that share something you want to explore: a relaxed groove, brighter instrumentation or a language you enjoy. A list of conflicting favorites can produce a less focused direction; more entries do not guarantee a better song.','You can also review a public or unlisted YouTube Music playlist import. It imports matched song and artist names, not YouTube audio. Check the matches and remove anything that does not belong before adding it to your profile.']},
   {heading:'2. Review the musical direction and singing language',paragraphs:['Choose the singing language explicitly when it matters. Automatic language is an interpretation of the available metadata, not a guarantee that the result will match an artist or your identity. Review the direction before confirming creation.','Favorites express preferences. They are not an instruction to reproduce a particular recording, melody or performer’s voice. A genre match is advisory: a technically valid song may arrive with a note that its measured style match was uncertain.']},
   {heading:'3. Check credits and press Generate once',paragraphs:['A public Music DNA song costs 20 credits (25 if private) and is 100–140 seconds long. Sign in, check the displayed price and press Generate once. Jamloom starts the music studio if needed, which usually takes 5–10 minutes, then makes your song automatically. You can keep browsing or close the page; we email you when it is ready.','Confirm creation only after reviewing the request. A technical failure or cancellation returns the reserved generation credits. A successfully delivered song uses its credits even if its musical direction is not your favorite. Each new variation is a new generation.']},
   {heading:'4. Listen, download and decide whether to share',paragraphs:['Listen for the arrangement, lyrics and overall direction rather than expecting an exact copy of one favorite. Replay and download of an existing result do not use more generation credits. Keep a downloaded copy of work you want to retain.','Songs are private by default. Public sharing is a separate choice; your favorite list and account identity are not published with the community listing. Withdrawing the listing cannot recall copies other people already downloaded.']},
  ],related:['voice-remix','ai-music-credits'],workspace:{href:'/music-dna',label:'Create with Music DNA'}
 },
 'record-sound-for-ai-song':{
  title:'How to record a sound for an AI song',
  description:'Prepare a clear voice, clap or everyday sound for Jamloom Improvise. Avoid clipping, choose a useful phrase and review consent before cloud creation.',
  updated:'2026-11-09',paragraphs:['A clear source gives an arranger something useful to work with. For Jamloom Improvise, start with one short sound: a spoken phrase, a clap pattern or a small everyday noise. Record only yourself or people who have agreed to this use.'],
  sections:[
   {heading:'Choose one recognizable idea',paragraphs:['A phrase with a distinct rhythm or a short repeated sound is easier to recognize than several overlapping conversations. Leave a small amount of quiet space around it so the beginning and ending are not cut off. Use the duration and file limits displayed in the recorder.']},
   {heading:'Reduce noise before pressing Record',paragraphs:['Move away from fans and loud speakers, and put the microphone where your voice is clear. Speak at an ordinary level. If playback sounds harsh or crackles on louder words, lower the recording level or move farther away and record again. A new arrangement cannot reliably restore clipped detail.']},
   {heading:'Listen to the source before uploading',paragraphs:['Play the recording back. Check the words you intend to include, background voices and whether anything private was captured. Re-record or choose another file if it contains information you do not want sent for cloud processing. Browser recording requires microphone permission and a secure connection.']},
   {heading:'Choose cloud Improvise or a Local Remix',paragraphs:['Improvise uploads the selected recording only after you confirm cloud creation, then weaves that actual sound into a new 30–45 second arrangement with AI singing. It costs 10 credits for a delivered arrangement, subject to available capacity. The AI singing is separate from the original recorded voice; it is not a promise to clone your voice.','The Local Remix tool processes on your device and creates instrumental arrangements around your sound without cloud generation credits. Choose it when you want to experiment locally. Local browser files are not automatically backed up to your account.']},
   {heading:'Keep the result you like',paragraphs:['Compare the rhythm, how the source sits in the mix and whether the ending feels complete. Musical results vary. Download accepted work before clearing browser storage, and review the sharing choice before making a cloud song public.']},
  ],related:['voice-remix','ai-music-credits'],workspace:{href:'/improvise',label:'Record a sound in Improvise'}
 },
 'ai-music-credits':{
  title:'AI music credits: what a Jamloom song costs',
  description:'Understand Jamloom song credits, nonexpiring balances, failed-generation refunds and the difference between free local mixing and paid cloud creation.',
  updated:'2026-11-09',paragraphs:['Generation credits pay for making a new cloud result. They are not a listening subscription: playing or downloading a song you already created does not use more credits. Free local DJ mixing and Local Remixes do not consume cloud generation credits.'],
  sections:[
   {heading:'How many credits does each song use?',paragraphs:['Improvise costs 10 credits for one 30–45 second arrangement built around your selected sound. Music DNA costs 20 credits for one 100–140 second song, including taste analysis. The quote is shown before confirmation. Private and public creations have the same credit price.','300 credits cover 30 Improvise arrangements, 15 Music DNA songs, or a mixture. For example, 10 Improvise arrangements use 100 credits and 10 Music DNA songs use the remaining 200. A new variation is a new generation.']},
   {heading:'Plans, top-ups and paused renewals',paragraphs:['Creator is $35 USD for 300 credits per successful monthly payment. During this limited web launch, future renewal collections are paused after the first payment until continuing service is funded and qualified. Paused months add no credits and create no catch-up charges.','A one-time $20 USD top-up adds 150 credits with no automatic renewal. Applicable tax is shown at checkout. Paid credits never expire, including after cancellation. See the pricing page for current availability before buying; the iPhone release is not yet public.']},
   {heading:'What happens if generation fails?',paragraphs:['Credits are reserved for the confirmed generation. Technical failure or cancellation releases those credits. A successfully delivered result uses the quoted credits even if you dislike the musical result. Replay does not create another charge; asking for another version does.','Creation depends on available funded capacity. Credits pay for each song; they are not unlimited generation, and a song usually starts within 5–10 minutes. Preparation may be unavailable or take time. Your paid credits remain in your account.']},
   {heading:'Choose the free tool when you only need to mix',paragraphs:['Use DJ Studio to practice transitions with the included tracks, or Local Remixes to arrange a sound on your device. Those activities are different from paying for a new cloud song. Pro, Academy courses and AI DJ have their own availability and entitlements; do not assume a song-credit purchase unlocks them.']},
  ],related:['make-a-song-from-favorite-music','record-sound-for-ai-song'],workspace:{href:'/pricing',label:'Check current plans and availability'}
 },
};

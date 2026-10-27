import {singingRecordings} from './singing-recordings.js';
import {singingOffer} from './singing-course.js';
document.getElementById('offer').textContent=`Singing Academy · $${singingOffer.priceCents/100} USD once when sales open. Free preview for now.`;
import {singingSongs,singingLessons,songStages,readProgress} from './singing-course.js';
const progress=readProgress(localStorage);
document.getElementById('progress').textContent=singingSongs.filter(s=>progress[s.id]?.passed).length+' / '+singingSongs.length+' songs complete';
function row(lesson){const a=document.createElement('a');a.href='./singing.html?mobile=1&lesson='+encodeURIComponent(lesson.id);a.className='song-link';const title=document.createElement('strong');title.textContent=(progress[lesson.id]?.passed?'✓ ':'')+lesson.title;const detail=document.createElement('span');detail.textContent=[lesson.focus||lesson.instruction,lesson.credit].filter(Boolean).join(' · ');a.append(title,detail);return a;}
const produced=document.createElement('section'),heading=document.createElement('h2');heading.textContent='Produced songs · listen & sing';produced.append(heading);for(const song of singingRecordings){produced.append(row({...song,instruction:song.style+' · 2 minutes · open practice, no grade'}));}document.getElementById('songs').append(produced);
for(const [index,name] of songStages.entries()){const section=document.createElement('section'),h=document.createElement('h2');h.textContent=(index+1)+'. '+name;section.append(h);for(const song of singingSongs.filter(s=>s.level===index))section.append(row(song));document.getElementById('songs').append(section);}
for(const lesson of singingLessons)document.getElementById('warmup-list').append(row(lesson));
if(location.hash==='#warmups')document.getElementById('warmups').open=true;

import {singingRecordings} from './singing-recordings.js';
import {singingOffer} from './singing-course.js';
document.getElementById('offer').textContent=`Singing Academy · $${singingOffer.priceCents/100} USD once when sales open. Free preview for now.`;
import {singingSongs,singingLessons,songStages,readProgress} from './singing-course.js';
const progress=readProgress(localStorage);
document.getElementById('progress').textContent=singingSongs.filter(s=>progress[s.id]?.passed).length+' / '+singingSongs.length+' songs complete';
function row(lesson){const a=document.createElement('a');a.href='./singing.html?mobile=1&lesson='+encodeURIComponent(lesson.id);a.className='song-link';const title=document.createElement('strong');title.textContent=(progress[lesson.id]?.passed?'✓ ':'')+lesson.title;const detail=document.createElement('span');detail.textContent=[lesson.focus||lesson.instruction,lesson.credit].filter(Boolean).join(' · ');a.append(title,detail);return a;}
const root=document.getElementById('songs'),filter=document.createElement('label'),select=document.createElement('select');
filter.textContent='Song language ';select.setAttribute('aria-label','Song language');
for(const [value,title] of [['','All languages'],['en','English'],['fr','French']]){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);}
filter.append(select);root.before(filter);
function renderSongs(){
 root.replaceChildren();const matches=song=>!select.value||song.language===select.value;
 const recordings=singingRecordings.filter(matches);
 if(recordings.length){const produced=document.createElement('section'),heading=document.createElement('h2');heading.textContent='Produced songs · listen & sing';produced.append(heading);for(const song of recordings)produced.append(row({...song,instruction:song.style+' · 2 minutes · open practice, no grade'}));root.append(produced);}
 for(const [index,name] of songStages.entries()){const songs=singingSongs.filter(s=>s.level===index&&matches(s));if(!songs.length)continue;const section=document.createElement('section'),h=document.createElement('h2');h.textContent=(index+1)+'. '+name;section.append(h);for(const song of songs)section.append(row(song));root.append(section);}
}
select.addEventListener('change',renderSongs);renderSongs();
for(const lesson of singingLessons)document.getElementById('warmup-list').append(row(lesson));
if(location.hash==='#warmups')document.getElementById('warmups').open=true;

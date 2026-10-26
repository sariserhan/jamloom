import {singingSongs,singingLessons,songStages,readProgress} from './singing-course.js';
const progress=readProgress(localStorage);
document.getElementById('progress').textContent=singingSongs.filter(s=>progress[s.id]?.passed).length+' / '+singingSongs.length+' songs complete';
function row(lesson){const a=document.createElement('a');a.href='./singing.html?mobile=1&lesson='+encodeURIComponent(lesson.id);a.className='song-link';const title=document.createElement('strong');title.textContent=(progress[lesson.id]?.passed?'✓ ':'')+lesson.title;const detail=document.createElement('span');detail.textContent=lesson.focus||lesson.instruction;a.append(title,detail);return a;}
for(const [index,name] of songStages.entries()){const section=document.createElement('section'),h=document.createElement('h2');h.textContent=(index+1)+'. '+name;section.append(h);for(const song of singingSongs.filter(s=>s.level===index))section.append(row(song));document.getElementById('songs').append(section);}
for(const lesson of singingLessons)document.getElementById('warmup-list').append(row(lesson));
if(location.hash==='#warmups')document.getElementById('warmups').open=true;

import {singingLessons,singingSongs,stages,songStages} from '../../../web/singing-course.js';
import CourseProgressClient from './CourseProgressClient';
export default function CourseProgress({warmups=false}:{warmups?:boolean}){
 const collection=(warmups?singingLessons:singingSongs).map(l=>({id:l.id,title:l.title,symbol:l.symbol,stage:l.stage,instruction:l.instruction,...('level' in l?{level:l.level,style:l.style,focus:l.focus}:{})}));
 return <CourseProgressClient warmups={warmups} collection={collection} stages={warmups?stages:songStages}/>;
}

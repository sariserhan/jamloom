import test from 'node:test';
import assert from 'node:assert/strict';
import {songLanguage,languageMatches,languageOptions} from '../lib/song-language';
test('language filtering normalizes recorded names without inventing missing language',()=>{
 for(const value of ['en','EN',' English '])assert.equal(songLanguage(value),'en');
 assert.equal(songLanguage('Turkish'),'tr');assert.equal(songLanguage('pt-BR'),'pt-br');
 for(const value of [undefined,'','auto','unknown','<script>'])assert.equal(songLanguage(value),'und');
 assert.equal(songLanguage('Instrumental'),'zxx');
 assert.equal(languageMatches(undefined,'en'),false);assert.equal(languageMatches(undefined,'und'),true);assert.equal(languageMatches('English','en'),true);
 assert.equal(languageMatches('tr',''),true);assert.deepEqual(new Set(languageOptions(['en','English','tr',undefined])),new Set(['en','tr','und']));
});

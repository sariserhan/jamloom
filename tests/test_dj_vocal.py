import sys
from pathlib import Path
import unittest
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_vocal import add_hook, steady_grid, short_phrase, mix_phrase, hook_phrase, HOOK_PHRASES


class VocalTests(unittest.TestCase):
    def test_session_hook_rotation_does_not_repeat_with_constant_seeds_or_retries(self):
        def phrases(session, seed):
            return [hook_phrase(dict(session=session,sequence=i*5+2,seed=seed)) for i in range(16)]
        a=phrases('a'*32,17)
        self.assertEqual(set(a[:8]),set(HOOK_PHRASES))
        self.assertTrue(all(x!=y for x,y in zip(a,a[1:])))
        self.assertEqual(a,phrases('a'*32,17))
        self.assertEqual(a,phrases('a'*32,99))
        self.assertNotEqual(a,phrases('b'*32,17))

    def test_separate_complete_phrases_do_not_become_one_long_vocal(self):
        rate=8000; voice=np.zeros((10*rate,2))
        for start in (1,5):
            voice[start*rate:(start+1)*rate]=.2*np.sin(np.arange(rate)[:,None]*2*np.pi*220/rate)
        clip,bounds=short_phrase(voice,rate,2*rate)
        self.assertEqual(len(clip),2*rate); self.assertLess(bounds['start'],1)
        self.assertEqual(bounds['end'],2); self.assertLess(bounds['end']-bounds['start'],2)
        # A sub-word pause must not split a longer connected performance.
        voice[2*rate:3*rate]=voice[rate:2*rate]
        voice[round(1.8*rate):round(2.1*rate)]=0
        clip,bounds=short_phrase(voice,rate,2*rate)
        self.assertGreater(bounds['start'],4);self.assertEqual(bounds['end'],6)

    def test_selection_rejects_long_tails_truncated_ends_and_invalid_audio(self):
        rate=8000; voice=np.zeros((10*rate,2))
        voice[rate:2*rate]=.2
        voice[2*rate:4*rate]=.01  # A quiet sustained word/tail is still part of the phrase.
        self.assertEqual(short_phrase(voice,rate,2*rate),(None,None))
        voice[:]=0;voice[9*rate:]=.2
        self.assertEqual(short_phrase(voice,rate,2*rate),(None,None))
        for bad in [np.zeros_like(voice),np.ones_like(voice),np.full_like(voice,np.nan),voice[:rate]]:
            with self.assertRaises(ValueError):short_phrase(bad,rate,2*rate)
        with self.assertRaises(ValueError):short_phrase(voice,0,2*rate)

    def test_overlay_keeps_accompaniment_and_does_not_normalize_other_music(self):
        original=np.full((10*8000,2),.1);clip=np.full((8000,2),.18)
        output=mix_phrase(original,clip,8000,3)
        np.testing.assert_array_equal(output[:24000],original[:24000])
        np.testing.assert_array_equal(output[32000:],original[32000:])
        self.assertGreaterEqual(float(output[24000:32000].min()),.26)
        with self.assertRaises(ValueError):mix_phrase(original,clip,8000,10)

    def test_phrase_start_requires_observed_quiet_not_a_truncated_file_edge(self):
        rate=8000; voice=np.zeros((10*rate,2))
        voice[:rate]=.2
        self.assertIsNone(short_phrase(voice,rate,2*rate)[0])
        voice[4*rate:5*rate]=.2
        clip,bounds=short_phrase(voice,rate,2*rate)
        self.assertIsNotNone(clip);self.assertGreater(bounds['start'],3.9)

    def test_vocal_padding_does_not_lower_music_and_release_is_smooth(self):
        rate=8000; original=np.full((5*rate,2),.1);clip=np.zeros((2*rate,2))
        clip[rate//4:3*rate//4]=.18
        output=mix_phrase(original,clip,rate,1)
        np.testing.assert_array_equal(output[rate:rate+rate//8],original[rate:rate+rate//8])
        np.testing.assert_array_equal(output[2*rate:3*rate],original[2*rate:3*rate])
        self.assertAlmostEqual(output[rate+rate//2,0],.26)
        # Recover the accompaniment envelope independently of the added voice.
        accompaniment=output[rate:3*rate]-clip
        self.assertLess(np.max(np.abs(np.diff(accompaniment[:,0]))),.0002)
        np.testing.assert_array_equal(mix_phrase(original,np.zeros_like(clip),rate,1),original)

    def test_hook_chooses_quieter_midrange_without_leaving_supported_beats(self):
        rate=8000;t=np.arange(60*rate)/rate
        bass=.2*np.sin(2*np.pi*80*t)*np.exp(-(t%(.5))*40)
        lead=.1*np.sin(2*np.pi*900*t);lead[(t>=28)&(t<30)]=0
        samples=np.column_stack((bass+lead,bass+lead))
        def generate(*args,**kwargs):
            voice=.2*np.sin(np.arange(10*rate)/rate*1000);voice[rate:]=0
            voice[:rate//10]=0
            return np.column_stack((voice,voice)),rate
        from unittest.mock import patch
        value=dict(version=1,session='a'*32,sequence=2,seed=17,style='house',energy=4)
        with patch('dj_vocal.steady_grid',return_value=(120.,0.,[(28.,34.)])):
            output,cue=add_hook(value,samples,rate,Path('/tmp'),None,generate)
        self.assertEqual(cue['start'],28);self.assertEqual(cue['seconds'],2)
        np.testing.assert_array_equal(output[:28*rate],samples[:28*rate])
        np.testing.assert_array_equal(output[30*rate:],samples[30*rate:])
    def test_sparse_vocal_effect_modes_are_explicit(self):
        from unittest.mock import patch
        rate=8000;t=np.arange(60*rate)/rate;samples=np.column_stack((.05*np.sin(2*np.pi*80*t),)*2)
        def generate(*args,**kwargs):
            voice=np.zeros((10*rate,2));voice[:rate]=.1*np.sin(2*np.pi*800*t[:rate,None]);voice[:rate//10]=0;return voice,rate
        with patch('dj_vocal.steady_grid',return_value=(140.,0.,[(10.,46.)])):
            for sequence,repeat,echo in [(2,True,False),(7,False,True),(12,True,True)]:
                _,cue=add_hook(dict(version=1,session='a'*32,sequence=sequence,seed=17,style='bass',energy=4),samples,rate,Path('/tmp'),None,generate)
                self.assertEqual((cue['repeat'],cue['echo']),(repeat,echo));self.assertLessEqual(cue['seconds'],2)

    def test_slow_styles_skip_hooks_that_exceed_the_current_duration_guard(self):
        samples=np.ones((8000,2))*.1
        for style in ['hip-hop','chill']:
            value=dict(version=1,session='a'*32,sequence=2,seed=17,style=style,energy=2)
            def forbidden(*a,**k):raise AssertionError('No paid vocal call for unsupported tempo')
            output,cue=add_hook(value,samples,8000,Path('/tmp'),None,forbidden)
            self.assertIs(output,samples);self.assertIsNone(cue)

    def test_measured_tempo_below_120_skips_before_spending_on_a_voice(self):
        from unittest.mock import patch
        samples=np.ones((60*8000,2))*.1
        value=dict(version=1,session='a'*32,sequence=2,seed=17,style='house',energy=4,beat={'bpm':120,'groove':'steady'})
        def forbidden(*a,**k):raise AssertionError('Measured phrase would exceed two seconds')
        with patch('dj_vocal.steady_grid',return_value=(119.95,0.,[(12.,44.)])):
            output,cue=add_hook(value,samples,8000,Path('/tmp'),None,forbidden)
        self.assertIs(output,samples);self.assertIsNone(cue)

    def test_grid_finds_other_supported_passages_when_the_middle_breaks(self):
        rate=8000; t=np.arange(60*rate)/rate
        base=.2*np.sin(2*np.pi*80*t)*np.exp(-((t+.1)%(60/128))*40)
        base[(t<6)|(t>46)]=0
        self.assertIsNotNone(steady_grid(np.column_stack((base,base)),rate,128))
        base[(t>28)&(t<34)]=0
        grid=steady_grid(np.column_stack((base,base)),rate,128)
        self.assertIsNotNone(grid);self.assertTrue(all(not (a<30<b) for a,b in grid[2]))
        noise=np.random.default_rng(1).normal(0,.1,(len(t),2))
        self.assertIsNone(steady_grid(noise,rate,128))

    def test_brief_hook_is_bounded_and_grid_aligned_without_changing_instrumental_edges(self):
        rate=8000; t=np.arange(60*rate)/rate
        base=.2*np.sin(2*np.pi*80*t)*np.exp(-((t+.1)%(60/128))*40)
        samples=np.column_stack((base, base)); calls=[]
        def generate(value, path, engine, hook):
            calls.append((value, hook))
            voice=.2*np.sin(np.arange(10*rate)/rate*1000)
            voice[:rate//10]=0
            voice[round(1.2*rate):]=0
            return np.column_stack((voice, voice)), rate
        value=dict(version=1,session='a'*32,sequence=2,seed=17,style='house',energy=4)
        output,cue=add_hook(value,samples,rate,Path('/tmp'),None,generate)
        self.assertIsNotNone(cue); self.assertLessEqual(cue['seconds'],2); self.assertTrue(cue['repeat'])
        self.assertEqual(len(calls),1); self.assertEqual(len(calls[0][1].split()),2); self.assertNotEqual(calls[0][0]['seed'],value['seed'])
        start=round(cue['start']*rate);end=start+round(cue['seconds']*rate)
        np.testing.assert_array_equal(output[:start],samples[:start]);np.testing.assert_array_equal(output[end:],samples[end:])
        self.assertGreater(np.max(np.abs(output-samples)), .01); self.assertLess(np.max(np.abs(output)),1)
        phase=t*2+t*t*.005
        drift=.2*np.sin(2*np.pi*80*t)*np.exp(-(phase%1)*20)
        self.assertIsNone(steady_grid(np.column_stack((drift,drift)),rate,128))
        diagnostic={}
        _,silent=add_hook(value,np.zeros_like(samples),rate,Path('/tmp'),None,generate,diagnostic=diagnostic)
        self.assertIsNone(silent); self.assertEqual(len(calls),1)
        self.assertEqual(diagnostic,{'status':'no_supported_grid','generated':False})
        def long_voice(*args, **kwargs):
            voice=.2*np.sin(np.arange(10*rate)/rate*1000)
            return np.column_stack((voice,voice)),rate
        rejected,cue=add_hook(value,samples,rate,Path('/tmp'),None,long_voice,diagnostic=diagnostic)
        self.assertIsNone(cue);np.testing.assert_array_equal(rejected,samples)
        self.assertEqual(diagnostic,{'status':'no_complete_short_phrase','generated':True})
        def truncated_voice(*args, **kwargs):
            voice=np.zeros((10*rate,2));voice[:rate]=.2
            return voice,rate
        rejected,cue=add_hook(value,samples,rate,Path('/tmp'),None,truncated_voice,diagnostic=diagnostic)
        self.assertIsNone(cue);np.testing.assert_array_equal(rejected,samples)
        self.assertEqual(diagnostic,{'status':'no_complete_short_phrase','generated':True})


if __name__=='__main__': unittest.main()

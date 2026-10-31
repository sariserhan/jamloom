import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from singing_response import fit_reply_lyrics, validate_reply_lyrics


class ReplyLyricFormat(unittest.TestCase):
    def test_only_redundant_complete_lines_are_removed(self):
        lines=['Did you say picnic?', 'Did you say picnic?', 'You sound surprised to me',
               'What did you mean?', 'Did you say picnic?', 'Tell me a little more',
               'Did you say picnic?', 'I am listening to you', 'Did you say picnic?']
        with self.assertRaises(ValueError):validate_reply_lyrics('\n'.join(lines))
        fixed, removed=fit_reply_lyrics('\n'.join(lines))
        self.assertEqual(fixed.splitlines(),lines[:-1])
        self.assertEqual(set(fixed.splitlines()),set(lines))
        self.assertEqual(removed,1)
        self.assertEqual(fit_reply_lyrics(fixed),(fixed,0))

    def test_distinct_lines_and_existing_limits_are_preserved(self):
        for text in ('\n'.join(f'You said number {n}' for n in range(9)),
                     'Hey you\nWhat now\nTell me\nGo on',
                     'Tell me what happened\nYou sound surprised\n(stage direction)\nWhat did you mean'):
            with self.assertRaises(ValueError):fit_reply_lyrics(text)
        valid='[Verse]\nTell me what happened\nYou sound surprised\n[Chorus]\nWhat did you mean\nI am listening to you'
        self.assertEqual(fit_reply_lyrics(valid),(valid,0))


if __name__=='__main__':unittest.main()

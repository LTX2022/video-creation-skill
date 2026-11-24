"""Generate original deterministic MP4s and exercise the public CLI."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT=Path(__file__).with_name('replay_guard.py')
W,H,FPS,N=64,48,24,24
ROI=(2,2,10,10)
CUES=((16,5,6,6),(30,14,6,6),(46,24,6,6))


def fixture(path, cue_frames, flavor, black=False, saturated=False, windows=None):
    raw=bytearray()
    for frame in range(N):
        for y in range(H):
            for x in range(W):
                color=(18+flavor,22+flavor,26+flavor)
                if (saturated and x<16 and y<16) or (2<=x<12 and 2<=y<12):
                    color=((0,0,0) if black else (240,20,20) if saturated
                           else (80,110+((x+y)%3)*30,180))
                for i,((xx,yy,ww,hh),t) in enumerate(zip(CUES,cue_frames)):
                    active = (frame >= t if windows is None else
                              any(start <= frame < end for start,end in windows[i]))
                    if active and xx<=x<xx+ww and yy<=y<yy+hh:
                        color=(228,50,62)
                raw.extend(color)
    subprocess.run(['ffmpeg','-nostdin','-v','error','-f','rawvideo','-pix_fmt','rgb24',
                    '-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264',
                    '-threads','1','-pix_fmt','yuv420p','-preset','ultrafast','-crf','16',
                    '-movflags','+faststart',str(path)],input=raw,check=True,capture_output=True)
    return {'path':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}


class ReplayTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.root=Path(cls.temp.name)
        cls.m={'version':1,'expected_delay_frames':3,'cases':[]}
        for i,timing in enumerate(((3,8,13),(4,9,14))):
            base=fixture(cls.root/f'base{i}.mp4',timing,i*10)
            corrected=(timing[0],timing[1]+3,timing[2]+3)
            cand=fixture(cls.root/f'candidate{i}.mp4',corrected,i*10)
            cls.m['cases'].append({'id':f'case-{i}','baseline':base,'candidate':cand,
                'width':W,'height':H,'fps':FPS,'frames':N,
                'cues':[{'roi':list(r),'channel':0,'direction':1,'threshold':100} for r in CUES],
                'protection':{'roi':list(ROI),'max_mae':6}})
        cls.black=fixture(cls.root/'black.mp4',(4,12,17),10,black=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def check(self,m,code,status):
        p=self.root/'comparison.json'
        p.write_text(json.dumps(m))
        got=subprocess.run([sys.executable,str(SCRIPT),'--manifest',str(p),'--media-root',str(self.root)],
                           check=False,capture_output=True,text=True,timeout=30)
        self.assertEqual(got.returncode, code, got.stdout+got.stderr)
        d=json.loads(got.stdout)
        self.assertEqual(d['status'],status,d)
        self.assertIs(d['approved'],False)
        self.assertIs(d['coreChangesApplied'],False)
        return d

    def test_repeat_win(self):
        d=self.check(self.m,0,'review-candidate')
        self.assertEqual([x['events'] for x in d['cases']], [[[3,8,13],[3,11,16]],[[4,9,14],[4,12,17]]])

    def test_opt_in_cue_run_preservation(self):
        m=copy.deepcopy(self.m)
        c=m['cases'][1]
        # One case opted in. Actual motion has fixed onset, +3 downstream;
        # end-exclusive intervals include a run ending on the final decoded frame.
        base=((4,8),), ((9,16),), ((18,21),)
        moved=base[0], ((12,19),), ((21,24),)
        c['baseline']=fixture(self.root/'pulse-base.mp4',(4,9,18),10,windows=base)
        c['candidate']=fixture(self.root/'pulse-moved.mp4',(4,12,21),10,windows=moved)
        c['preserve_cue_runs']=True
        d=self.check(m,0,'review-candidate')
        self.assertNotIn('cue_run_lengths',d['cases'][0])
        self.assertEqual(d['cases'][1]['cue_run_lengths'],[[[4],[7],[3]],[[4],[7],[3]]])
        for name, near, expected in (
            ('short', ((12,15),), [3]),
            ('repeat', ((12,19),(21,24)), [7,3]),
        ):
            with self.subTest(negative=name):
                c['candidate']=fixture(self.root/f'pulse-{name}.mp4',(4,12,21),10,
                                       windows=(base[0],near,moved[2]))
                c['preserve_cue_runs']=False
                self.check(m,0,'review-candidate')  # Legacy behavior, including explicit false.
                c['preserve_cue_runs']=True
                d=self.check(m,1,'reject-regression')
                self.assertEqual(d['cases'][1]['cue_run_lengths'][1][1],expected)
                self.assertEqual(d['cases'][1]['regressions'],['cue_run_lengths'])
                self.assertEqual(d['cases'][1]['shifts'],[0,3,3])
        for c in m['cases']:
            c['candidate']=c['baseline']
        self.check(m,1,'hold-no-qualifying-gain')

    def test_invalid_cue_run_flag(self):
        m=copy.deepcopy(self.m)
        for bad in (1, 'true', None, [], {}):
            with self.subTest(bad=bad):
                m['cases'][0]['preserve_cue_runs']=bad
                d=self.check(m,2,'inconclusive')
                self.assertEqual(d['reason'],'preserve_cue_runs must be a boolean')

    def test_tie(self):
        m=copy.deepcopy(self.m)
        for c in m['cases']:
            c['candidate']=c['baseline']
        self.check(m,1,'hold-no-qualifying-gain')

    def test_protected_replacement(self):
        m=copy.deepcopy(self.m)
        m['cases'][1]['candidate']=self.black
        d=self.check(m,1,'reject-regression')
        self.assertEqual(d['cases'][1]['regressions'],['protected_roi'])
        self.assertEqual(d['cases'][1]['shifts'],[0,3,3])

    def test_flat_saturated_protected_baseline(self):
        m=copy.deepcopy(self.m)
        m['cases'][0]['baseline']=fixture(self.root/'flat.mp4',(3,8,13),0,saturated=True)
        d=self.check(m,2,'inconclusive')
        self.assertEqual(d['reason'],'protected baseline ROI too flat/dark')

    def test_missing_wrong_hash_unsupported_and_outside(self):
        unknown=self.root/'not-video.mp4'
        unknown.write_text('not a video')
        symlink=self.root/'symlink.mp4'
        symlink.symlink_to(self.root/'base0.mp4')
        for bad in ({'path':'missing.mp4','sha256':'0'*64},
                    {'path':'candidate0.mp4','sha256':'0'*64},
                    {'path':unknown.name,'sha256':hashlib.sha256(unknown.read_bytes()).hexdigest()},
                    {'path':'../base0.mp4','sha256':'0'*64},
                    {'path':symlink.name,'sha256':self.m['cases'][0]['baseline']['sha256']}):
            with self.subTest(bad=bad['path']):
                m=copy.deepcopy(self.m)
                m['cases'][0]['candidate']=bad
                self.check(m,2,'inconclusive')


if __name__=='__main__':
    unittest.main()

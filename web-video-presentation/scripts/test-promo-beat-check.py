import copy, importlib.util, json, subprocess, sys, tempfile, unittest
from pathlib import Path
p=Path(__file__).with_name('promo-beat-check.py')
spec=importlib.util.spec_from_file_location('beat',p); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def fixture():
 return {'schema':1,'fps':30,'toleranceFrames':2,'measurementNote':'synthetic test','anchors':[{'id':'a','visualFrame':60,'audioPeakSeconds':2.02}]}
class Checks(unittest.TestCase):
 def test_offset_sign(self): self.assertAlmostEqual(m.check(fixture())['meanResidualFrames'],.6)
 def test_negative(self):
  d=fixture(); d['anchors'][0]['audioPeakSeconds']=1.98; self.assertAlmostEqual(m.check(d)['meanResidualFrames'],-.6)
 def test_boundary(self):
  d=fixture();d['anchors'][0]['audioPeakSeconds']=62/30; self.assertEqual(m.check(d)['status'],'within-project-tolerance')
 def test_outside(self):
  d=fixture();d['anchors'][0]['audioPeakSeconds']=2.1;self.assertEqual(m.check(d)['status'],'outside-project-tolerance')
 def test_fractional_fps(self):
  d=fixture();d['fps']=30000/1001;d['anchors'][0]['audioPeakSeconds']=60/d['fps'];self.assertAlmostEqual(m.check(d)['meanResidualFrames'],0)
 def test_duplicate(self):
  d=fixture();d['anchors']*=2
  with self.assertRaises(ValueError):m.check(d)
 def test_empty(self):
  d=fixture();d['anchors']=[]
  with self.assertRaises(ValueError):m.check(d)
 def test_no_mutation(self):
  d=fixture(); orig=copy.deepcopy(d);m.check(d);self.assertEqual(orig,d)
 def test_invalid_numbers(self):
  for key,val in [('fps',True),('fps',0),('fps',float('nan')),('toleranceFrames',-1),('toleranceFrames',float('inf'))]:
   d=fixture();d[key]=val
   with self.subTest(key=key,val=val),self.assertRaises(ValueError):m.check(d)
 def test_huge_numbers(self):
  for key in ['fps','toleranceFrames']:
   d=fixture();d[key]=10**1000
   with self.subTest(key=key),self.assertRaises(ValueError):m.check(d)
 def test_computed_overflow_cli(self):
  d=fixture();d['fps']=10**308;d['anchors'][0]['audioPeakSeconds']=10**308;d['anchors'][0]['visualFrame']=0
  with self.assertRaises(ValueError):m.check(d)
  with tempfile.TemporaryDirectory() as td:
   f=Path(td)/'big.json';f.write_text(json.dumps(d));r=subprocess.run([sys.executable,str(p),str(f)],capture_output=True,text=True)
   self.assertEqual(r.returncode,2);self.assertNotIn('Traceback',r.stderr)
 def test_invalid_anchor(self):
  for key,val in [('visualFrame',True),('visualFrame',2.2),('visualFrame',-1),('audioPeakSeconds',float('inf')),('audioPeakSeconds',-1),('id','')]:
   d=fixture();d['anchors'][0][key]=val
   with self.subTest(key=key,val=val),self.assertRaises(ValueError):m.check(d)
 def test_missing_measurement(self):
  d=fixture();d['measurementNote']=''
  with self.assertRaises(ValueError):m.check(d)
 def test_directions(self):
  d=fixture();d['anchors'].append({'id':'b','visualFrame':60,'audioPeakSeconds':1.98}); self.assertFalse(m.check(d)['sameDirection'])
 def test_cli_exit_codes(self):
  with tempfile.TemporaryDirectory() as td:
   file=Path(td)/'m.json'
   for peak,code in [(2,0),(4,1),(-1,2)]:
    d=fixture();d['anchors'][0]['audioPeakSeconds']=peak;file.write_text(json.dumps(d));r=subprocess.run([sys.executable,str(p),str(file)],capture_output=True);self.assertEqual(r.returncode,code)
if __name__=='__main__':unittest.main()

import argparse, importlib.util, sys, tempfile, hashlib, json
from pathlib import Path
from dataclasses import replace
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--film',required=True);p.add_argument('--report',required=True);a=p.parse_args()
f=Path(a.film).resolve();spec=importlib.util.spec_from_file_location('tested_film',f);m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
checks=[]
def check(name,fn):
 try:fn();checks.append({'name':name,'pass':True})
 except Exception as e:checks.append({'name':name,'pass':False,'error':repr(e)})
def reject(fn):
 try:fn()
 except (ValueError,TypeError,FileNotFoundError,FileExistsError):return
 raise AssertionError('invalid input was accepted')
c=m.Config(width=384,height=216,threads=12,samples=64)
def same_frame():
 a=m.render_frame(450,c).tobytes();m.render_frame(90,c);b=m.render_frame(450,c).tobytes();assert a==b
check('same frame is pixel-identical after out-of-order seek',same_frame)
def same_time():assert m.render_frame(300,c).tobytes()==m.render_frame(600,replace(c,fps=60)).tobytes()
check('equal physical time gives equal pixels at30and60fps',same_time)
def ids():
 first=m.model_state(0,c);last=m.model_state(25,c);assert np.array_equal(first['ids'],last['ids']);first['ids'][0]=-1;assert m.model_state(0,c)['ids'][0]==0
check('stable population IDs and exposed IDs cannot mutate later state',ids)
def finite():
 for t in np.linspace(0,26,131):assert np.isfinite(m.model_state(float(t),c)['positions']).all()
check('131 model samples across full timeline have finite positions',finite)
check('negative/out-of-range/fractional frames rejected',lambda:[reject(lambda x=x:m.render_frame(x,c)) for x in [-1,780,1.5,True]])
check('invalid dimensions,fps,seed,count rejected',lambda:[reject(lambda kw=kw:m.Config(**kw)) for kw in [{'width':127},{'width':1919},{'fps':0},{'fps':True},{'seed':-1},{'threads':0},{'samples':0}]])
check('nonfinite duration/grain rejected',lambda:[reject(lambda kw=kw:m.Config(**kw)) for kw in [{'duration':float('nan')},{'duration':float('inf')},{'grain':float('nan')}]])
check('boolean duration/grain rejected',lambda:[reject(lambda kw=kw:m.Config(**kw)) for kw in [{'duration':True},{'grain':False}]])
check('missing local font fails without downloading',lambda:reject(lambda:m.preflight(replace(c,cjk_font='/not-a-font/no-font.ttf'))))
def no_overwrite():
 with tempfile.TemporaryDirectory() as td:
  p=Path(td)/'keep.txt';p.write_bytes(b'keep');reject(lambda:m.require_new_file(p));assert p.read_bytes()==b'keep'
check('existing output is never overwritten',no_overwrite)
def dangling():
 with tempfile.TemporaryDirectory() as td:
  p=Path(td)/'dangling.mp4';p.symlink_to(Path(td)/'missing.mp4');reject(lambda:m.require_new_file(p))
check('dangling output symlink rejected',dangling)
def seed_change():assert m.render_frame(90,c).tobytes()!=m.render_frame(90,replace(c,seed=c.seed+1)).tobytes()
check('new seed changes actual rendered pixels',seed_change)
r={'schema':1,'renderer':'python-numpy-pillow-scipy-ffmpeg','source_sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'scope':'Independent small-frame runtime contracts, not aesthetics, Remotion, alpha or NLE proof.'}
Path(a.report).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(bool(r['failed']))

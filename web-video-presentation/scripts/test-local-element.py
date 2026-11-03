#!/usr/bin/env python3
"""Real encoded-media regression; synthetic fixtures are not user footage/browser evidence."""
import argparse
import contextlib
import copy
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('local_element', Path(__file__).with_name('local-element.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', help='optional NEW folder retaining synthetic fixtures and actual encoded results')
    args=parser.parse_args()
    if args.artifacts:
        folder=Path(args.artifacts).resolve()
        folder.mkdir(parents=True, exist_ok=False)
        context=contextlib.nullcontext(str(folder))
    else:
        context=tempfile.TemporaryDirectory(prefix='local-element-test-')
    with context as root:
        root = Path(root)
        # Explicitly synthetic RGBA butterfly-like test marker, not a generated user asset.
        im = Image.new('RGBA',(32,24))
        d = ImageDraw.Draw(im)
        d.ellipse((1,2,14,21),fill=(255,80,20,255)); d.ellipse((17,2,30,21),fill=(255,80,20,255)); d.rectangle((14,4,17,22),fill=(30,20,50,255))
        im.save(root/'marker.png')
        for role, box in [('left-wing',(0,0,14,24)),('right-wing',(18,0,32,24)),('body',(14,0,18,24))]:
            layer = Image.new('RGBA',im.size); layer.paste(im.crop(box),box); layer.save(root/f'{role}.png')
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=128x96:r=24:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(root/'plate.mp4')],check=True)
        c = {'schema':1,'scope':'element-animation','localProcessingAuthorized':True,'coordinateSpace':'screen','width':128,'height':96,'fps':24,'frames':24,'outputMode':'both','element':{'motionModel':'rigid','asset':{'path':'marker.png','rights':'synthetic regression fixture'},'startFrame':3,'endFrameExclusive':21,'allowClipping':False,'keyframes':[{'frame':3,'x':.25,'y':.5,'scale':1,'rotationDeg':0},{'frame':20,'x':.75,'y':.5,'scale':1,'rotationDeg':0}]},'plate':{'path':'plate.mp4','rights':'synthetic lavfi regression fixture','trimStartSec':.25,'fit':'contain','fpsPolicy':'reject','audio':'keep'}}
        counter = 0
        def execute(value):
            nonlocal counter
            counter += 1
            path=root/f'contract-{counter}.json'; path.write_text(json.dumps(value))
            return m.render(path,root/f'out-{counter}')
        report = execute(c)
        assert report['sourceUnchanged'] and report['outputs']['element-alpha.mov']['audioStreams']==0
        assert report['outputs']['shot-composite.mp4']['audioStreams']==1
        out=root/'out-1'
        raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(out/'element-alpha.mov'),'-vf','alphaextract','-pix_fmt','gray','-f','rawvideo','-'])
        def alpha_at(f): return Image.frombytes('L',(128,96),raw[f*128*96:(f+1)*128*96])
        assert alpha_at(0).getextrema()==(0,0) and alpha_at(23).getextrema()==(0,0)
        assert alpha_at(3).getextrema()[1]>240 and alpha_at(3).getbbox()[0]<alpha_at(20).getbbox()[0]
        rgb=subprocess.check_output(['ffmpeg','-v','error','-i',str(out/'shot-composite.mp4'),'-pix_fmt','rgb24','-f','rawvideo','-'])
        first=Image.frombytes('RGB',(128,96),rgb[:128*96*3]); assert first.getpixel((64,48))[2]>200
        # Real separate wing canvases + supplied pixel hinges, deterministic 2D articulation.
        layered=copy.deepcopy(c); layered['element'].pop('asset'); layered['element'].update(motionModel='layered-wings',flapHz=2,minWingScale=.2,layers=[{'path':f'{role}.png','rights':'synthetic separate test layer','role':role,**({'hingeX':16} if role!='body' else {})} for role in ('left-wing','right-wing','body')])
        lr=execute(layered); assert lr['wingModel'].startswith('2D hinge')
        wingraw=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'out-2'/'element-alpha.mov'),'-vf','alphaextract','-pix_fmt','gray','-f','rawvideo','-'])
        def wingbox(f): return Image.frombytes('L',(128,96),wingraw[f*128*96:(f+1)*128*96]).getbbox()
        openbox, closedbox=wingbox(3),wingbox(9)
        assert openbox[2]-openbox[0] > closedbox[2]-closedbox[0]+10
        # Contact sheet is review material, not an automatic artistic/edge approval.
        sheet=Image.new('RGB',(128*4,96*2),'#808080')
        for row, folder in enumerate(('out-1','out-2')):
            pixels=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/folder/'shot-composite.mp4'),'-pix_fmt','rgb24','-f','rawvideo','-'])
            for col, f in enumerate((0,3,9,20)):
                sheet.paste(Image.frombytes('RGB',(128,96),pixels[f*128*96*3:(f+1)*128*96*3]),(col*128,row*96))
        sheet.save(root/'synthetic-contact-sheet.png')
        # Shot-only route genuinely trims the supplied video and explicitly mutes it.
        shot=copy.deepcopy(c); shot.pop('element'); shot.update(scope='single-shot',outputMode='composite'); shot['plate']['audio']='mute'
        assert execute(shot)['outputs']['shot-composite.mp4']['audioStreams']==0
        # Exact rational cadence + explicit source resampling.
        rational=copy.deepcopy(c); rational['fps']='30000/1001'; rational['plate']['fpsPolicy']='resample'
        assert execute(rational)['outputs']['element-alpha.mov']['fps']=='30000/1001'
        alpha_only=copy.deepcopy(c); alpha_only.pop('plate'); alpha_only['outputMode']='alpha'
        assert set(execute(alpha_only)['outputs'])=={'element-alpha.mov'}
        composite_only=copy.deepcopy(c); composite_only['outputMode']='composite'
        assert set(execute(composite_only)['outputs'])=={'shot-composite.mp4'}
        cases=[]
        bad=copy.deepcopy(c); bad['localProcessingAuthorized']=False; cases.append((bad,'authorization'))
        bad=copy.deepcopy(c); bad['element']['motionModel']='true-3d-flap'; cases.append((bad,'motionModel must'))
        bad=copy.deepcopy(c); bad['plate']['trimStartSec']=1.5; cases.append((bad,'too short'))
        bad=copy.deepcopy(c); bad['tracking']={'enabled':True}; cases.append((bad,'unsupported'))
        bad=copy.deepcopy(c); bad['plate']['rights']=''; cases.append((bad,'rights'))
        bad=copy.deepcopy(c); bad['element']['keyframes'][0]['x']=-1; cases.append((bad,'clips'))
        bad=copy.deepcopy(c); bad['fps']=30; cases.append((bad,'fps differs'))
        bad=copy.deepcopy(c); bad['outputMode']='alpha'; cases.append((bad,'must not include plate'))
        for bad, message in cases:
            try: execute(bad)
            except ValueError as exc: assert message in str(exc),(message,str(exc))
            else: raise AssertionError('invalid contract accepted: '+message)
        # Briefly visible foreground must be sampled; entirely offscreen must fail in composite too.
        brief=copy.deepcopy(alpha_only); brief['element']['allowClipping']=True
        brief['element']['keyframes']=[dict(c['element']['keyframes'][0],x=-1),dict(c['element']['keyframes'][0],frame=6,x=.5),dict(c['element']['keyframes'][0],frame=9,x=-1),dict(c['element']['keyframes'][1],x=-1)]
        br=execute(brief)
        assert any(s['max']>0 for s in br['outputs']['element-alpha.mov']['decodedAlphaSamples'])
        invisible=copy.deepcopy(composite_only); invisible['element']['allowClipping']=True
        for key in invisible['element']['keyframes']: key['x']=-1
        try: execute(invisible)
        except ValueError as exc: assert 'invisible' in str(exc)
        else: raise AssertionError('invisible composite accepted')
        repeated=copy.deepcopy(layered)
        for layer in repeated['element']['layers']: layer['path']='marker.png'
        try: execute(repeated)
        except ValueError as exc: assert 'distinct actual layer' in str(exc)
        else: raise AssertionError('duplicate wing layers accepted')
        (root/'playlist.m3u8').write_text('#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\nplate.mp4\n#EXT-X-ENDLIST\n')
        nested=copy.deepcopy(c); nested['plate']['path']='playlist.m3u8'
        try: execute(nested)
        except subprocess.CalledProcessError: pass
        else: raise AssertionError('nested unhashed playlist media accepted')
        link=root/'dangling'; link.symlink_to(root/'unexpected')
        try: m.render(root/'contract-1.json',link)
        except ValueError as exc: assert 'symlink' in str(exc)
        else: raise AssertionError('dangling output symlink accepted')
        assert not (root/'unexpected').exists()
        original_run=m.run
        def fail_composite(args):
            if 'libx264' in args: raise RuntimeError('injected composite encoder failure')
            return original_run(args)
        m.run=fail_composite
        try:
            try: execute(c)
            except RuntimeError: pass
            else: raise AssertionError('injected failure ignored')
        finally: m.run=original_run
        failed=root/f'out-{counter}'
        assert (failed/'render-failed.json').is_file()
        assert not list(failed.glob('*.mov')) and not list(failed.glob('*.mp4'))
        assert (failed/'element-alpha.mov.incomplete').is_file()
        path=root/'contract-1.json'
        try: m.render(path,out)
        except ValueError as exc: assert 'never overwrite' in str(exc)
        else: raise AssertionError('overwrite accepted')
        print('PASS: all three output modes; rigid + real layered-wing encode; single-shot trim; alpha pixels/handles/movement; composite pixels/audio; rational fps; source hashes; negative contracts + duplicate layers/symlink/offscreen + caught-failure quarantine. Synthetic fixtures only, not browser or visual approval.')

if __name__=='__main__': main()

#!/usr/bin/env python3
"""Synthetic, object-neutral 2D rig regression, including real alpha and video encoding."""
import copy
import argparse
import contextlib
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

spec=importlib.util.spec_from_file_location('local_element',Path(__file__).with_name('local-element.py'))
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifacts', help='new directory retaining synthetic fixtures and encoded outputs')
    args=parser.parse_args()
    if args.artifacts:
        folder=Path(args.artifacts).resolve(); folder.mkdir(parents=True,exist_ok=False)
        context=contextlib.nullcontext(str(folder))
    else:
        context=tempfile.TemporaryDirectory(prefix='generic-rig-test-')
    with context as temp:
        root=Path(temp)
        image=Image.new('RGBA',(64,64)); ImageDraw.Draw(image).rectangle((31,18,44,22),fill=(255,80,20,255)); image.save(root/'part.png')
        key=lambda f: {'frame':f,**m.rig.CHANNELS}
        layer={'id':'arbitrary-part','path':'part.png','rights':'synthetic test shape','pivot':[32,32],'allowLayerClipping':False,'keyframes':[key(2),key(21)],'oscillations':[{'channel':'rotationDeg','amplitude':30,'hz':2,'phaseDeg':0},{'channel':'scaleX','amplitude':.3,'hz':1,'phaseDeg':0}]}
        validate=lambda l:m.rig.validate(l,image.size,2,22,24,m.fields,m.number,m.require)
        validate(layer)
        assert m.rig.pose(layer,2,2,24)['rotationDeg']==0
        assert abs(m.rig.pose(layer,5,2,24)['rotationDeg']-30)<1e-8
        a=m.rig.transform(image,layer,2,2,24); b=m.rig.transform(image,layer,5,2,24)
        assert ImageChops.difference(a.getchannel('A'),b.getchannel('A')).getbbox()
        assert a.tobytes()==m.rig.transform(image,layer,2,2,24).tobytes()  # independent frame order
        moved=copy.deepcopy(layer); moved['oscillations']=[]
        for k in moved['keyframes']: k.update(x=5,y=3,opacity=.5)
        transformed=m.rig.transform(image,moved,2,2,24)
        assert transformed.getbbox()==(36,21,50,26) and transformed.getchannel('A').getextrema()[1]==128
        rotated=copy.deepcopy(moved)
        for k in rotated['keyframes']: k.update(x=0,y=0,rotationDeg=90,opacity=1)
        assert m.rig.transform(image,rotated,2,2,24).getbbox()==(18,19,23,33)
        for mutate, token in [
            (lambda x:x.update(pivot=[-1,32]),'pivot'),
            (lambda x:x['oscillations'][0].update(channel='walk'),'known channel'),
            (lambda x:x['oscillations'][0].update(hz=13),'hz'),
            (lambda x:x['oscillations'][1].update(amplitude=2),'scale'),
            (lambda x:x.update(allowLayerClipping='yes'),'explicit'),
            (lambda x:x['keyframes'][1].update(frame=20),'span')]:
            bad=copy.deepcopy(layer); mutate(bad)
            try: validate(bad)
            except ValueError as exc: assert token in str(exc),str(exc)
            else: raise AssertionError('bad rig accepted')
        clipped=copy.deepcopy(moved)
        for k in clipped['keyframes']: k['x']=100
        try:m.rig.transform(image,clipped,2,2,24)
        except ValueError as exc: assert 'clip' in str(exc)
        else:raise AssertionError('clipping silently accepted')
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=128x96:r=24:d=1','-c:v','libx264','-pix_fmt','yuv420p',str(root/'plate.mp4')],check=True)
        other=copy.deepcopy(layer); other['id']='same-art-different-pose'; other['oscillations'][0]['phaseDeg']=180
        c={'schema':1,'scope':'element-animation','localProcessingAuthorized':True,'coordinateSpace':'screen','width':128,'height':96,'fps':24,'frames':24,'outputMode':'both','element':{'motionModel':'layered-rig','layers':[layer,other],'startFrame':2,'endFrameExclusive':22,'allowClipping':False,'keyframes':[{'frame':2,'x':.5,'y':.5,'scale':1,'rotationDeg':0},{'frame':21,'x':.5,'y':.5,'scale':1,'rotationDeg':0}]},'plate':{'path':'plate.mp4','rights':'synthetic blue plate','trimStartSec':0,'fit':'contain','fpsPolicy':'reject','audio':'mute'}}
        path=root/'request.json';path.write_text(json.dumps(c));report=m.render(path,root/'out')
        assert report['sourceUnchanged'] and 'authored' in report['rigModel']
        assert set(report['outputs'])=={'element-alpha.mov','shot-composite.mp4'}
        raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'out'/'element-alpha.mov'),'-vf','alphaextract','-pix_fmt','gray','-f','rawvideo','-'])
        frame=lambda f:raw[f*128*96:(f+1)*128*96]
        assert not any(frame(0)) and not any(frame(23)) and any(frame(2)) and frame(2)!=frame(5)
        rgb=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'out'/'shot-composite.mp4'),'-pix_fmt','rgb24','-f','rawvideo','-'])
        first=Image.frombytes('RGB',(128,96),rgb[:128*96*3]); assert first.getpixel((64,48))[2]>200
        active=Image.frombytes('RGB',(128,96),rgb[2*128*96*3:3*128*96*3]);assert active.getpixel((68,36))[0]>150
        sheet=Image.new('RGB',(128*4,96),'#808080')
        for column,f in enumerate((0,2,5,21)):
            sheet.paste(Image.frombytes('RGB',(128,96),rgb[f*128*96*3:(f+1)*128*96*3]),(column*128,0))
        sheet.save(root/'synthetic-contact-sheet.png')
        # Animated PNG must not be silently reduced to its first frame in any model.
        second=Image.new('RGBA',(64,64)); second.paste((0,255,0,255),(20,20,30,30))
        image.save(root/'animated.png',save_all=True,append_images=[second],duration=100,loop=0)
        with Image.open(root/'animated.png') as apng: assert apng.n_frames==2
        for model in ('layered-rig','rigid','layered-wings'):
            bad=copy.deepcopy(c); e=bad['element']; e['motionModel']=model
            if model=='layered-rig': e['layers'][0]['path']='animated.png'
            elif model=='rigid':
                e.pop('layers');e['asset']={'path':'animated.png','rights':'synthetic APNG test'}
            else:
                e.update(flapHz=2,minWingScale=.2,layers=[{'role':role,'path':'animated.png' if role=='body' else 'part.png','rights':'synthetic APNG test',**({'hingeX':32} if role!='body' else {})} for role in ('body','left-wing','right-wing')])
            path=root/f'apng-{model}.json';path.write_text(json.dumps(bad))
            try:m.render(path,root/f'apng-{model}-out')
            except ValueError as exc:assert 'animated PNG unsupported' in str(exc)
            else:raise AssertionError('APNG silently accepted')
            assert not (root/f'apng-{model}-out').exists()
        # Partial-alpha overlap keeps painter ordering and straight-alpha color through encoding.
        blend=copy.deepcopy(c);blend['element']['layers']=[]
        for name,color in [('red',(255,0,0,128)),('green',(0,255,0,128))]:
            part=Image.new('RGBA',(64,64));part.paste(color,(20,20,44,44));part.save(root/f'{name}.png')
            blend['element']['layers'].append({'id':name,'path':f'{name}.png','rights':'synthetic blend test','pivot':[32,32],'allowLayerClipping':False,'keyframes':[key(2),key(21)]})
        path=root/'blend.json';path.write_text(json.dumps(blend));m.render(path,root/'blend-out')
        for filename,fmt,channels,expected in [('element-alpha.mov','rgba',4,[85,170,0,192]),('shot-composite.mp4','rgb24',3,[64,128,63])]:
            pixels=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'blend-out'/filename),'-vf','select=eq(n\\,2)','-frames:v','1','-pix_fmt',fmt,'-f','rawvideo','-'])
            index=(48*128+64)*channels
            assert all(abs(x-y)<7 for x,y in zip(pixels[index:index+channels],expected))
        hidden=Image.new('RGBA',(64,64),(0,255,0,0));hidden.paste((255,0,0,128),(20,20,44,44))
        clean=copy.deepcopy(blend['element']['layers'][0])
        for k in clean['keyframes']:k.update(rotationDeg=19.25,scaleX=.75,scaleY=.8,x=.4,y=.7)
        transformed=m.rig.transform(hidden,clean,2,2,24)
        visible=[transformed.getpixel((x,y)) for y in range(64) for x in range(64) if transformed.getpixel((x,y))[3]>0]
        assert max(v[1] for v in visible)==0
        print('PASS: generic affine rig transforms, deterministic out-of-order frames, arbitrary layer IDs/reused art, pivot rotation/translation/opacity, rejection cases, actual alpha+composite encode, decoded motion/handles/composite pixels and source hashes; APNG rejection for all models; partial-alpha order and hidden RGB edges. Synthetic only; no recognition, segmentation or aesthetic approval.')

if __name__=='__main__':main()

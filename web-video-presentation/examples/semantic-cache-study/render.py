#!/usr/bin/env python3
"""Original deterministic semantic motion study. Pillow -> FFmpeg, no assets/network."""
from pathlib import Path
import math,json,subprocess,time,hashlib
from PIL import Image,ImageDraw,ImageFont
import argparse, shutil
from functools import lru_cache
W,H,FPS,DURATION=1280,720,30,14
FONT=BOLD=None
@lru_cache(maxsize=None)
def font(n,bold=False):
    path=BOLD if bold else FONT
    if path is None: raise RuntimeError('先配置 --font 和 --bold-font；不会自动下载字体。')
    return ImageFont.truetype(path,n)
def configure_fonts(regular,bold):
    global FONT,BOLD
    for path in (regular,bold):
        if not Path(path).is_file(): raise ValueError(f'字体文件不存在：{path}；请提供本地CJK字体，不会自动下载。')
        try: f=ImageFont.truetype(str(path),32)
        except OSError as e: raise ValueError(f'无法读取字体：{path}') from e
        missing=bytes(f.getmask(chr(0x10ffff)))
        needed='同一个请求到期就换路模型时间秒条件检查相不未已直接复用重新计算响应还剩恰好仍是只改变而且才可逻辑示意非性能测试'
        absent=sorted({c for c in needed if bytes(f.getmask(c))==missing})
        if absent: raise ValueError(f'字体缺少所需中文字形：{path}：'+''.join(absent))
    FONT=str(regular);BOLD=str(bold);font.cache_clear()
def ease(v): v=max(0,min(1,v)); return v*v*(3-2*v)
def mix(a,b,p): return tuple(a[i]+(b[i]-a[i])*p for i in range(2))
def model(now,request_key='report:v1',cached_key='report:v1',expires=10):
    same=request_key==cached_key; fresh=now<expires
    return dict(request_id='R1',request_key=request_key,cached_key=cached_key,now=now,expires=expires,key_equal=same,fresh=fresh,hit=same and fresh,route='REUSE' if same and fresh else 'COMPUTE',units='s')
def state(frame):
    video_s=frame/FPS; m=model(4 if video_s<7 else 10)
    m.update(video_s=video_s,local_s=video_s if video_s<7 else video_s-7,pass_index=0 if video_s<7 else 1)
    return m
def poly_point(points,p):
    ds=[math.dist(a,b) for a,b in zip(points,points[1:])]; x=max(0,min(1,p))*sum(ds)
    for a,b,d in zip(points,points[1:],ds):
        if x<=d:return mix(a,b,x/d)
        x-=d
    return points[-1]
def render(frame,foreground=False):
    s=state(frame); t=s['local_s']; hit=s['hit']; accent='#337b61' if hit else '#c85c2c'
    paper='#f4f0e6'; ink='#20332e'; muted='#6b756e'; quiet='#c5ccbf'
    im=Image.new('RGBA',(W,H),(0,0,0,0) if foreground else paper); d=ImageDraw.Draw(im)
    def txt(x,y,st,size=28,fill=ink,bold=False,anchor=None): d.text((x,y),st,font=font(size,bold),fill=fill,anchor=anchor)
    def line(p,fill=quiet,width=4):d.line(p,fill=fill,width=width,joint='curve')
    txt(60,31,'同一个请求，到期就换路',46,ink,True)
    txt(62,114,f'模型时间  {s["now"]} 秒',32,accent,True)
    txt(1218,114,f'到期  {s["expires"]} 秒',32,ink,True,'ra')
    line([(60,174),(1220,174)],quiet,2)
    A=(135,395); G=(453,395); U=(812,297); L=(812,530); O=(1140,395)
    upper=[G,(583,395),(663,297),U,(973,297),O]
    lower=[G,(583,395),(663,530),L,(973,530),O]
    line([A,G],quiet,5);line(upper,quiet,5);line(lower,quiet,5)
    if t>=2.5:
        path=upper if hit else lower;line(path,accent,8)
        a,b=path[-2:]; q=mix(a,b,.69);ang=math.atan2(b[1]-a[1],b[0]-a[0]);d.polygon([q,(q[0]-20*math.cos(ang-.52),q[1]-20*math.sin(ang-.52)),(q[0]-20*math.cos(ang+.52),q[1]-20*math.sin(ang+.52))],fill=accent)
    # Request source is a docking mark, not another identity-bearing card.
    d.arc((89,349,181,441),15,345,fill=quiet,width=4)
    txt(135,447,'请求',30,ink,True,'ma')
    txt(135,493,s['request_key'],20,muted,False,'ma')
    # Predicate gate: large circular field with just two conditions.
    d.ellipse((344,286,562,504),fill=paper,outline=accent if 1.6<=t else quiet,width=5)
    txt(453,317,'条件检查',26,muted,False,'ma')
    txt(453,365,'key 相同' if s['key_equal'] else 'key 不同',30,ink,True,'ma')
    txt(453,412,'未到期' if s['fresh'] else '已到期',32,accent if t>=2 else muted,True,'ma')
    # Branch objects: two offset sheets for reuse; rotating-style static gear for compute.
    for rect in [(718,246,886,330),(732,258,900,342)]:d.rounded_rectangle(rect,14,fill=paper,outline=accent if hit and t>=2.5 else quiet,width=4)
    txt(816,276,'直接复用',32,accent if hit and t>=2.5 else muted,True,'ma')
    d.rounded_rectangle((714,483,910,577),20,fill=paper,outline=accent if not hit and t>=2.5 else quiet,width=4)
    txt(812,504,'重新计算',32,accent if not hit and t>=2.5 else muted,True,'ma')
    d.ellipse((1094,349,1186,441),fill=paper,outline=accent if t>=5 else quiet,width=5)
    if t>=5:
        line([(1119,396),(1135,410),(1163,380)],accent,6)
    txt(1140,453,'响应',30,ink,True,'ma')
    # Re-evaluation is explicitly a return path, not a new request or cache write.
    if s['pass_index']==0 and t>=5.8:
        rp=[(1140,303),(1220,303),(1220,590),(50,590),(50,303),(135,303)]
        for a,b in zip(rp,rp[1:]):
            n=max(1,int(math.dist(a,b)/18))
            for i in range(n):line([mix(a,b,i/n),mix(a,b,min(1,(i+.4)/n))],quiet,3)
        pos=poly_point(rp,ease((t-5.8)/1.2))
    elif t<.7:pos=A
    elif t<1.7:pos=mix(A,G,ease(t-.7))
    elif t<3:pos=G
    elif t<5:pos=poly_point(upper if hit else lower,ease((t-3)/2))
    else:pos=O
    # A paper-shaped request with folded corner stays recognizable along both routes.
    px,py=pos
    if not (s['pass_index']==0 and t>=5.8): py-=92+44*max(0,1-abs(px-453)/180)
    if not (s['pass_index']==0 and t>=5.8): line([(px,py+32),(px,py+68)],accent,3)
    shape=[(px-47,py-32),(px+28,py-32),(px+47,py-13),(px+47,py+32),(px-47,py+32)]
    d.polygon(shape,fill=accent);line([(px+28,py-32),(px+28,py-13),(px+47,py-13)],paper,2)
    txt(px,py-19,'请求 1',24,paper,True,'ma')
    if t>=2.5:
        status=f'还剩 {s["expires"]-s["now"]} 秒 → 直接复用' if hit else '恰好到期 → 重新计算'
    else:status='key 相同，而且未到期，才可复用'
    if s['pass_index']==0 and t>=5.8:status='仍是请求 1，只改变模型时间'
    txt(640,611,status,32,accent if t>=2.5 else muted,True,'ma')
    txt(640,675,'逻辑示意 · 非性能测试',20,muted,False,'ma')
    return im if foreground else im.convert('RGB')

def main():
    ap=argparse.ArgumentParser(description='渲染原创缓存机制小样；输出只能写入指定的新/空目录。')
    ap.add_argument('--out-dir',required=True,type=Path)
    ap.add_argument('--font',required=True,type=Path,help='本地CJK常规字体文件')
    ap.add_argument('--bold-font',required=True,type=Path,help='本地CJK粗体字体文件')
    args=ap.parse_args()
    ROOT=args.out_dir.resolve()
    if ROOT.exists() and (not ROOT.is_dir() or any(ROOT.iterdir())):
        ap.error('--out-dir 必须是新目录或空目录；拒绝覆盖已有文件。')
    try: configure_fonts(args.font,args.bold_font)
    except ValueError as e: ap.error(str(e))
    if not shutil.which('ffmpeg'): ap.error('缺少本地ffmpeg；请自行准备，不会自动安装。')
    ROOT.mkdir(parents=True,exist_ok=True)
    start=time.monotonic(); out=ROOT/'semantic-cache-boundary.mp4' 
    cmd=['ffmpeg','-n','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    hashes=[]
    for i in range(FPS*DURATION):
        im=render(i); raw=im.tobytes(); hashes.append(hashlib.sha256(raw).hexdigest());p.stdin.write(raw)
    p.stdin.close();assert p.wait()==0
    render(12*FPS).save(ROOT/'cover.png')
    render(4*FPS,True).save(ROOT/'foreground-alpha.png')
    samples=[0,1.5,2.7,3.7,5.3,6.4,7,8.8,9.7,10.7,12.2,13.8]
    sheet=Image.new('RGB',(1280,3*204),'#101b24');sd=ImageDraw.Draw(sheet)
    for j,t in enumerate(samples):
        x=(j%4)*320;y=(j//4)*204
        sheet.paste(render(round(t*FPS)).resize((320,180)),(x,y));sd.text((x+8,y+182),f'video {t:.1f}s / model {state(round(t*FPS))["now"]}s',font=font(16),fill='#edf1e9')
    sheet.save(ROOT/'keyframes.png')
    report={'render_and_encode_wall_seconds':round(time.monotonic()-start,3),'frame_count':len(hashes),'unique_source_frames':len(set(hashes)),'adjacent_identical_source_frames':sum(a==b for a,b in zip(hashes,hashes[1:])),'state_boundary_tests':{'4s_hit':model(4)['hit'],'10s_miss':not model(10)['hit'],'9.999s_hit':model(9.999)['hit'],'mismatch_miss':not model(4,request_key='other')['hit']},'deterministic_random_order':all(hashlib.sha256(render(i).tobytes()).hexdigest()==hashes[i] for i in [419,0,210,89,299,150,209,300]),'source_frame_hashes':hashes}
    (ROOT/'validation.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='source_frame_hashes'},indent=2))
if __name__=='__main__':main()

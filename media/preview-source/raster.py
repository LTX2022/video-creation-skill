import ctypes as c,subprocess,sys,json,os,pathlib,time
rsvg=c.CDLL('librsvg-2.so.2');cairo=c.CDLL('libcairo.so.2');gobj=c.CDLL('libgobject-2.0.so.0')
rsvg.rsvg_handle_new_from_data.argtypes=[c.c_char_p,c.c_size_t,c.c_void_p];rsvg.rsvg_handle_new_from_data.restype=c.c_void_p
rsvg.rsvg_handle_render_cairo.argtypes=[c.c_void_p,c.c_void_p];rsvg.rsvg_handle_render_cairo.restype=c.c_int
cairo.cairo_image_surface_create.argtypes=[c.c_int,c.c_int,c.c_int];cairo.cairo_image_surface_create.restype=c.c_void_p
cairo.cairo_create.argtypes=[c.c_void_p];cairo.cairo_create.restype=c.c_void_p
cairo.cairo_image_surface_get_data.argtypes=[c.c_void_p];cairo.cairo_image_surface_get_data.restype=c.c_void_p
for fn in ['cairo_surface_flush','cairo_destroy','cairo_surface_destroy']:getattr(cairo,fn).argtypes=[c.c_void_p]
gobj.g_object_unref.argtypes=[c.c_void_p]
while pathlib.Path('PAUSE').exists(): time.sleep(1)
id,num,name,seconds=sys.argv[1:5]; count=sys.argv[5] if len(sys.argv)>5 else ''
env=dict(os.environ,FONTCONFIG_FILE=str(pathlib.Path('fonts.conf').resolve()),XDG_CACHE_HOME=str(pathlib.Path('cache').resolve()))
# Fontconfig must be configured before librsvg first creates a layout.
os.environ.update({k:env[k] for k in ['FONTCONFIG_FILE','XDG_CACHE_HOME']})
node=subprocess.Popen(['node','--import','tsx','render-svg.tsx',id,num,name,seconds]+([count] if count else []),stdout=subprocess.PIPE,env=env)
out=pathlib.Path('output')/(id+'.mp4')
ff=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgra','-s','960x576','-r','30','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],stdin=subprocess.PIPE,env=env)
t=time.monotonic();n=0
try:
 for line in node.stdout:
  row=json.loads(line);svg=row['svg'].encode();handle=rsvg.rsvg_handle_new_from_data(svg,len(svg),None)
  if not handle:raise RuntimeError('SVG parse failed')
  surface=cairo.cairo_image_surface_create(0,960,576);ctx=cairo.cairo_create(surface)
  if not rsvg.rsvg_handle_render_cairo(handle,ctx):raise RuntimeError('SVG raster failed')
  cairo.cairo_surface_flush(surface);ff.stdin.write(c.string_at(cairo.cairo_image_surface_get_data(surface),960*576*4))
  if n==0:pathlib.Path('output',id+'-first.svg').write_bytes(svg)
  cairo.cairo_destroy(ctx);cairo.cairo_surface_destroy(surface);gobj.g_object_unref(handle);n+=1
finally:ff.stdin.close()
rc=node.wait();fc=ff.wait()
if rc or fc or n!=int(count or float(seconds)*30):raise RuntimeError(f'Incomplete render {rc=} {fc=} {n=}')
pathlib.Path('output',id+'-render.json').write_text(json.dumps({'id':id,'frames':n,'seconds':seconds,'elapsed':time.monotonic()-t,'font':'Noto Sans CJK SC','engine':'React SSR -> librsvg/Cairo -> FFmpeg','not_remotion_browser':True},indent=2))
print(id,n,round(time.monotonic()-t,2),flush=True)

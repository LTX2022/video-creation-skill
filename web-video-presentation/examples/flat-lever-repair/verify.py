"""Verify decoded lossless RGB master against the only original source."""
import argparse,json,subprocess
from pathlib import Path
from PIL import Image
import numpy as np

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path); a=p.parse_args()
    source=np.array(Image.open(a.source).convert('RGB'))
    raw=subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',str(a.output),'-map','0:v:0','-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgb24','-'])
    D=np.frombuffer(raw,dtype=np.uint8).reshape((-1,360,640,3));assert len(D)==120
    rest=[*range(9),*range(39,49),*range(79,120)]
    assert np.array_equal(D[rest],np.broadcast_to(source,D[rest].shape))
    unchanged={}
    for name,(l,t,r,b) in {'left-base':(119,194,180,268),'right-base':(491,195,515,267),'decorative-pin':(260,226,285,246),'navy':(40,15,600,85),'hinge-center':(211,209,225,223)}.items():
        q=np.abs(D[:,t:b,l:r].astype(np.int16)-source[t:b,l:r].astype(np.int16))
        unchanged[name]=int(q.max());assert q.max()==0
    assert np.array_equal(D[18],D[58]) and not np.array_equal(D[18],D[0])
    def endpoint(A):
        Y,X=np.indices(A.shape[:2])
        R=A[:,:,0].astype(float); B=A[:,:,2]
        # Find the 100 orange samples furthest right, measuring the same
        # exposed end of the handle instead of a center-of-mass that moves
        # when an arbitrarily chosen crop boundary clips the shaft.
        ids=np.flatnonzero((R-B>70)&(X>401)&(Y<194))
        j=ids[np.argsort(X.ravel()[ids],kind='stable')[-100:]]
        return X.ravel()[j].mean(),Y.ravel()[j].mean()
    eps=[endpoint(D[i]) for i in [0,18,58,119]]
    assert eps[1][1]<eps[0][1]-35 and eps[0]==eps[-1] and eps[1]==eps[2]
    print(json.dumps({'exact_rest_frames':len(rest),'unchanged_protected_max_error':unchanged,'decoded_peak_changed_pixels':int(np.count_nonzero(np.any(D[18]!=source,axis=2))),'right_tip_probe_at_f0_f18_f58_f119':eps},indent=2))

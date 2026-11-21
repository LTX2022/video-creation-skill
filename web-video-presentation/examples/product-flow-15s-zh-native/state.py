"""One deterministic timeline, reusable by any renderer. Original demonstration."""
import math
FPS=30
FRAMES=450
TASK='筹备一次产品发布'
STEPS=['明确目标受众','准备发布素材','安排发布时间']
COMPLETE_TIMES=[10.2,11.4,12.6]

def ease(t,a,b):
    x=max(0.,min(1.,(t-a)/(b-a)))
    return x*x*(3-2*x)

def state(frame):
    if type(frame) is not int or not 0<=frame<FRAMES: raise ValueError('frame outside timeline')
    t=frame/FPS
    count=min(len(TASK),int(ease(t,1.0,3.4)*(len(TASK)+1)))
    done=[t>=c for c in COMPLETE_TIMES]
    return {'frame':frame,'time':t,'task_id':'任务 041','input':TASK[:count],
            'build_requested':t>=4.7,'plan_progress':ease(t,5.0,6.1),
            'row_progress':[ease(t,6.15+i*.8,6.75+i*.8) for i in range(3)],
            'done':done,'done_count':sum(done),'all_done':all(done),
            'phase':'INPUT' if t<5 else ('PLAN' if t<10 else 'COMPLETE')}

def cursor(t):
    # The pointer presses the build button, then the actual completion toggles.
    keys=[(0,(1490,910)),(3.8,(1490,910)),(4.55,(1312,700)),(4.85,(1312,700)),
          (6.0,(1530,905)),(9.3,(1530,905)),(10.05,(974,449)),(10.30,(974,449)),
          (11.25,(974,579)),(11.50,(974,579)),(12.45,(974,709)),(12.75,(974,709)),
          (13.6,(1560,910)),(15,(1560,910))]
    for (a,p),(b,q) in zip(keys,keys[1:]):
        if a<=t<=b:
            u=ease(t,a,b);return (p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u)
    return keys[-1][1]

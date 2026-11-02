#!/usr/bin/env python3
"""Read-only output-peak residual diagnostics; not beat detection or audio QA."""
import json
import math
import sys

def number(value, name, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(name + ' must be a finite number')
    try:
        finite = math.isfinite(value)
    except OverflowError:
        finite = False
    if not finite:
        raise ValueError(name + ' must be a finite number')
    if value < 0 or (positive and value == 0):
        raise ValueError(name + ' outside permitted range')
    return value

def check(data):
    if not isinstance(data, dict) or data.get('schema') != 1 or isinstance(data.get('schema'),bool):
        raise ValueError('schema must be 1')
    fps = number(data.get('fps'), 'fps', True)
    tolerance = number(data.get('toleranceFrames'), 'toleranceFrames')
    if not isinstance(data.get('measurementNote'),str) or not data['measurementNote'].strip():
        raise ValueError('measurementNote required; measurements are not authenticated')
    anchors = data.get('anchors')
    if not isinstance(anchors,list) or not anchors:
        raise ValueError('at least one measured anchor required')
    ids, rows = set(), []
    for a in anchors:
        if not isinstance(a,dict): raise ValueError('anchor must be an object')
        ident=a.get('id')
        if not isinstance(ident,str) or not ident.strip() or ident in ids: raise ValueError('unique nonempty anchor id required')
        ids.add(ident)
        frame=number(a.get('visualFrame'),'visualFrame')
        if not isinstance(frame,int): raise ValueError('visualFrame must be an integer')
        peak=number(a.get('audioPeakSeconds'),'audioPeakSeconds')
        try:
            residual=peak*fps-frame
            if not math.isfinite(residual): raise ValueError('computed residual not finite')
        except OverflowError as exc:
            raise ValueError('computed residual outside supported numeric range') from exc
        rows.append({'id':ident,'residualFrames':residual,'withinTolerance':abs(residual)<=tolerance+1e-9})
    residuals=[r['residualFrames'] for r in rows]
    return {'schema':1,'status':'within-project-tolerance' if all(r['withinTolerance'] for r in rows) else 'outside-project-tolerance',
            'scope':'numeric diagnostic only; no listening, detection, render or approval',
            'fps':fps,'toleranceFrames':tolerance,'anchors':rows,
            'meanResidualFrames':sum(r/len(rows) for r in residuals),
            'maxAbsoluteResidualFrames':max(map(abs,residuals)),
            'sameDirection':all(r>1e-9 for r in residuals) or all(r< -1e-9 for r in residuals)}

def main(argv):
    if len(argv)!=2:
        print('Usage: promo-beat-check.py measurements.json',file=sys.stderr); return 2
    try:
        with open(argv[1],encoding='utf-8') as f: result=check(json.load(f))
    except (OSError,ValueError,TypeError) as exc:
        print(str(exc),file=sys.stderr); return 2
    print(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False))
    return 0 if result['status']=='within-project-tolerance' else 1

if __name__=='__main__': sys.exit(main(sys.argv))

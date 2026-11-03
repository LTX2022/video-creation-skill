"""Object-independent, authored 2D cutout transforms. No recognition or segmentation."""
import math

CHANNELS = {'x': 0., 'y': 0., 'rotationDeg': 0., 'scaleX': 1., 'scaleY': 1., 'opacity': 1.}


def validate(spec, size, start, end, fps, fields, number, require):
    fields(spec, 'path rights id pivot keyframes oscillations allowLayerClipping', 'rig layer')
    require(isinstance(spec.get('id'), str) and spec['id'].strip(), 'layer id required')
    pivot = spec.get('pivot')
    require(isinstance(pivot, list) and len(pivot) == 2, 'pivot requires [x,y] in source pixels')
    for i, v in enumerate(pivot): number(v, 'pivot', 0, size[i])
    require(type(spec.get('allowLayerClipping')) is bool, 'allowLayerClipping must be explicit')
    keys = spec.get('keyframes')
    require(isinstance(keys, list) and len(keys) >= 2, 'rig needs >=2 layer keyframes')
    previous = -1
    for key in keys:
        fields(key, 'frame ' + ' '.join(CHANNELS), 'layer keyframe')
        require(type(key.get('frame')) is int and previous < key['frame'], 'layer frames must increase')
        previous = key['frame']
        for name in CHANNELS:
            number(key.get(name), name)
            if name.startswith('scale'): number(key[name], name, .05, 20)
            if name == 'opacity': number(key[name], name, 0, 1)
    require(keys[0]['frame'] == start and keys[-1]['frame'] == end-1, 'layer keys must span visible interval')
    waves = spec.get('oscillations', [])
    require(isinstance(waves, list), 'oscillations must be a list')
    channels = set()
    for wave in waves:
        fields(wave, 'channel amplitude hz phaseDeg', 'oscillation')
        channel = wave.get('channel')
        require(channel in CHANNELS and channel not in channels, 'one oscillation per known channel')
        channels.add(channel)
        number(wave.get('amplitude'), 'amplitude', 0)
        number(wave.get('hz'), 'hz', .001, float(fps)/2)
        number(wave.get('phaseDeg'), 'phaseDeg')
        # Bound the entire cycle, not just the sampled frames; no invisible collapse or implicit clamps.
        if channel.startswith('scale'):
            require(min(k[channel] for k in keys)-wave['amplitude'] >= .05 and max(k[channel] for k in keys)+wave['amplitude'] <= 20, 'oscillating scale outside .05..20')
        if channel == 'opacity':
            require(min(k[channel] for k in keys)-wave['amplitude'] >= 0 and max(k[channel] for k in keys)+wave['amplitude'] <= 1, 'oscillating opacity outside 0..1')


def pose(spec, frame, start, fps):
    a, b = next((a,b) for a,b in zip(spec['keyframes'], spec['keyframes'][1:]) if a['frame'] <= frame <= b['frame'])
    t = (frame-a['frame'])/(b['frame']-a['frame'])
    result = {name: a[name]+(b[name]-a[name])*t for name in CHANNELS}
    for wave in spec.get('oscillations', []):
        result[wave['channel']] += wave['amplitude'] * math.sin(2*math.pi*wave['hz']*(frame-start)/float(fps)+math.radians(wave['phaseDeg']))
    return result


def transform(image, spec, frame, start, fps):
    from PIL import Image
    p = pose(spec, frame, start, fps)
    angle = math.radians(p['rotationDeg'])
    # Forward transform in image coordinates; positive angle is visually counterclockwise.
    a, b = math.cos(angle)*p['scaleX'], math.sin(angle)*p['scaleY']
    c, d = -math.sin(angle)*p['scaleX'], math.cos(angle)*p['scaleY']
    px, py = spec['pivot']
    tx, ty = px+p['x']-a*px-b*py, py+p['y']-c*px-d*py
    box = image.getchannel('A').getbbox()
    if box and not spec['allowLayerClipping']:
        points = [(a*x+b*y+tx,c*x+d*y+ty) for x in (box[0], box[2]) for y in (box[1], box[3])]
        if any(x < -1e-7 or y < -1e-7 or x > image.width+1e-7 or y > image.height+1e-7 for x,y in points):
            raise ValueError(f"layer {spec['id']} may clip source canvas at frame {frame}; pad registered layers or explicitly allow layer clipping")
    det = a*d-b*c
    inverse = (d/det, -b/det, (b*ty-d*tx)/det, -c/det, a/det, (c*tx-a*ty)/det)
    result = image.transform(image.size, Image.Transform.AFFINE, inverse, Image.Resampling.BICUBIC)
    if p['opacity'] != 1:
        result.putalpha(result.getchannel('A').point(lambda value: round(value*p['opacity'])))
    return result

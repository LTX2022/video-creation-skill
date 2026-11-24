"""Expand a small layered-shot form into local-element.py's existing schema."""
import argparse
import json
from pathlib import Path


def compile_shot(c):
    n = c["frames"]
    if type(n) is not int or n < 2:
        raise ValueError("frames must be an integer >=2")
    layers = []
    for item in c["layers"]:
        keys = item.get("rotationKeys", [[0, 0], [n-1, 0]])
        layers.append(dict(id=item["id"], path=item["png"], rights=c["rights"],
                           pivot=item["pivot"], allowLayerClipping=False,
                           keyframes=[dict(frame=f, x=0, y=0, rotationDeg=a,
                                           scaleX=1, scaleY=1, opacity=1)
                                      for f, a in keys]))
    background = c["background"]
    mode = background["mode"]
    if mode not in ("alpha", "composite", "both"):
        raise ValueError("explicit background mode: alpha, composite, or both")
    if (mode != "alpha") != bool(background.get("plate")):
        raise ValueError("composite/both require the intended plate path; alpha forbids a plate")
    result = dict(schema=1, scope="element-animation",
                  localProcessingAuthorized=c["localProcessingAuthorized"],
                  coordinateSpace="screen", width=c["canvas"][0],height=c["canvas"][1],
                  fps=c["fps"], frames=n, outputMode=mode,
                  element=dict(motionModel="layered-rig", startFrame=0,
                               endFrameExclusive=n, allowClipping=False,
                               keyframes=[dict(frame=f,x=.5,y=.5,scale=1,rotationDeg=0)
                                          for f in (0,n-1)], layers=layers))
    if mode != "alpha":
        result["plate"] = dict(path=background["plate"], rights=c["rights"], trimStartSec=0,
                               fit="contain", fpsPolicy="reject", audio="mute")
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("form", type=Path)
    p.add_argument("contract", type=Path)
    a = p.parse_args()
    if a.form.resolve().parent != a.contract.resolve().parent:
        p.error("form and output contract must share a folder for asset paths")
    compiled = compile_shot(json.loads(a.form.read_text()))
    with a.contract.open("x", encoding="utf-8") as f:
        json.dump(compiled,f,ensure_ascii=False,indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()

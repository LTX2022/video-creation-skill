"""Original acceptance example: audio events require distinct decoded onsets."""
from array import array
from pathlib import Path
from tempfile import TemporaryDirectory
import json, subprocess, sys, wave

SR=48000
LIMIT=33

def media(path, onset_ms):
    buf=array("h",[0])*int(SR*1.2)
    for t in onset_ms:
        start=t*SR//1000
        for sample in range(start,start+96):
            buf[sample]=18000
    if sys.byteorder != "little":
        buf.byteswap()
    with wave.open(str(path),"wb") as wav:
        wav.setparams((1,2,SR,0,"NONE","not compressed"))
        wav.writeframes(buf.tobytes())

def detected(path):
    p=subprocess.run(["ffmpeg","-nostdin","-v","error","-xerror","-i",str(path),"-map","0:a:0",
                      "-ac","1","-ar",str(SR),"-f","s16le","pipe:1"],check=True,capture_output=True)
    buf=array("h")
    buf.frombytes(p.stdout)
    if sys.byteorder != "little":
        buf.byteswap()
    return [round(i*1000/SR) for i in range(1,len(buf)) if abs(buf[i])>10000 and abs(buf[i-1])<=10000]

def score(expected,found):
    if not expected:
        return "not-applicable"
    # Onsets are distinct and sorted. Use earliest unused in each window to retain coverage.
    cursor=0
    for target in sorted(expected):
        while cursor<len(found) and found[cursor]<target-LIMIT:
            cursor+=1
        if cursor==len(found) or found[cursor]>target+LIMIT:
            return "fail"
        cursor+=1
    return "pass"

with TemporaryDirectory() as tmp:
    cases=[("two_each",[1000,1020],[1000,1020],"pass"),("one_for_two",[1000,1020],[1010],"fail"),
           ("no_active_events",[],[1010],"not-applicable"),("missing_audio_event",[1000],[],"fail")]
    results={}
    for key,expected,actual,wanted in cases:
        path=Path(tmp)/(key+".wav")
        media(path,actual)
        times=detected(path)
        result=score(expected,times)
        assert times==actual and result==wanted, (key,times,result,wanted)
        results[key]={"events_ms":expected,"decoded_onsets_ms":times,"result":result}
    print(json.dumps({"scope":"synthetic hard pulse with lossless PCM; not a mix or upstream run","result":results},indent=2))

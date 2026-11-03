#!/usr/bin/env python3
"""Authorized task-end observations -> reviewable lessons -> next-run checklist. Never executes lessons."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import uuid
from datetime import datetime, timezone
import preference_memory as memory

STAGES = {'setup','assets','audio','timing','typecheck','build','preflight','qa','render','validate','cover','package','design','planning'}
ACTIONS = {'verify-regression','review-before-next-run','clarify-with-user','propose-core-change','reuse-reviewed-pattern'}

def digest(raw): return hashlib.sha256(raw).hexdigest()
def now(): return datetime.now(timezone.utc).isoformat()
def safe_file(root, relative):
    if not isinstance(relative,str) or not relative or Path(relative).is_absolute() or '..' in Path(relative).parts:
        raise ValueError('Evidence path must be project-relative without traversal')
    parts=Path(relative).parts
    if any(part.startswith('.') for part in parts) or any(re.search(r'(^|[._-])(secret|secrets|credential|credentials|token|tokens|private-key|key|keys|password|passwords|passwd)([._-]|$)',part,re.I) for part in parts) or Path(relative).suffix.lower() in ['.pem','.key','.p12','.pfx']:
        raise ValueError('Hidden files and recognizable secrets/credentials are not learning evidence')
    path=root/relative; memory.no_links(path)
    if not path.is_file() or path.stat().st_nlink != 1: raise ValueError('Evidence must be a regular unlinked project file')
    if root not in path.resolve().parents: raise ValueError('Evidence outside authorized project root')
    if path.stat().st_size>2_000_000: raise ValueError('Evidence exceeds bounded 2 MB input')
    return path.read_bytes()

def load(root,user):
    memory.ident(user)
    config=memory.read(root/'consent.json')
    if config.get('schema')!=1: raise ValueError('Invalid consent store')
    folder=root/'lessons';memory.no_links(folder)
    target=folder/(user+'.json')
    db=memory.read(target) if target.exists() else {'schema':1,'user':user,'lessons':[]}
    if db.get('schema')!=1 or db.get('user')!=user or not isinstance(db.get('lessons'),list): raise ValueError('Invalid lesson store')
    for item in db['lessons']:
        for field in ['id','project','checkId','authorizationRef']: memory.ident(item[field])
        if item['stage'] not in STAGES or item['action'] not in ACTIONS or item['status'] not in ['pending','approved','revoked'] or item['scope'] not in ['project','user']:
            raise ValueError('Invalid lesson fields')
        if type(item['version']) is not int or item['version']<1 or type(item['synthetic']) is not bool: raise ValueError('Invalid lesson version')
    return config,target,db

def save(target,db):
    memory.no_links(target.parent)
    target.parent.mkdir(mode=0o700,exist_ok=True)
    memory.write(target,db)

def compact(item):
    return {key:item[key] for key in ['id','version','project','scope','runId','stage','checkId','source','action','target','evidence','confidence','status','synthetic','supersedes','observation']}

def verify_stage_log(raw, run, stages):
    expected=STAGES-{'design','planning'}
    if len(stages)!=len(expected) or {s.get('stage') for s in stages}!=expected:raise ValueError('Summary must preserve every measured stage exactly once')
    groups={};unknown_count=0;terminal_keys=set()
    for line in raw.decode('utf-8').splitlines():
        try: event=json.loads(line)
        except ValueError:
            if line.strip():unknown_count+=1
            continue
        if not isinstance(event,dict) or not isinstance(event.get('runId'),str) or not event['runId'] or event.get('stage') not in expected or not isinstance(event.get('eventId'),str) or not event['eventId']:
            unknown_count+=1;continue
        if event.get('runId')!=run:continue
        event_type='terminal' if event.get('schema')==1 else event.get('eventType') if event.get('schema')==2 else None
        if event_type not in ['terminal','started','finished']:
            unknown_count+=1;continue
        groups.setdefault(event['eventId'],{}).setdefault(event_type,[]).append(event)
    actual={stage:{'terminalAttempts':0,'failedAttempts':0,'recordedRetryAttempts':0,'unfinishedAttempts':0} for stage in STAGES}
    for group in groups.values():
        if any(len({json.dumps(e,sort_keys=True) for e in events})!=1 for events in group.values()):
            unknown_count+=1;continue
        terminal=(group.get('finished') or group.get('terminal') or [None])[0]
        if terminal:
            if terminal.get('status') not in ['success','failed','spawn-error','interrupted']:
                unknown_count+=1;continue
            row=actual[terminal['stage']]
            row['terminalAttempts']+=1
            terminal_keys.add(digest(json.dumps([terminal['stage'],terminal.get('label'),terminal.get('workloadId')],sort_keys=True,separators=(',',':')).encode()))
            row['failedAttempts']+=int(terminal['status']!='success')
            row['recordedRetryAttempts']+=int(type(terminal.get('attempt')) is int and terminal['attempt']>1)
        elif group.get('started'):
            actual[group['started'][0]['stage']]['unfinishedAttempts']+=1
    for stage in stages:
        if stage.get('stage') not in STAGES: raise ValueError('Unsupported stage')
        for field in ['terminalAttempts','failedAttempts','recordedRetryAttempts','unfinishedAttempts']:
            if type(stage.get(field)) is not int or stage[field]!=actual[stage['stage']][field]:
                raise ValueError('Summary disagrees with actual recorded stage events')
    return {'completedWorkloadIds':sorted(terminal_keys),'unknownEvents':unknown_count,'unfinishedAttempts':sum(x['unfinishedAttempts'] for x in actual.values()),'terminalAttempts':sum(x['terminalAttempts'] for x in actual.values())}

def task_end(a,db):
    project=Path(a.project_root)
    if not project.is_absolute() or '..' in project.parts: raise ValueError('Explicit absolute authorized project root required')
    memory.no_links(project); project=project.resolve()
    raw=safe_file(project,a.summary); summary=json.loads(raw)
    if summary.get('schema')!=1 or summary.get('kind')!='deterministic-review-summary': raise ValueError('Unsupported execution summary')
    if summary.get('declaredProjectStatus') not in ['completed','draft','partial','terminated','canceled','cancelled']:
        raise ValueError('Task-end requires declared delivery or explicit termination, not an ongoing/unknown run')
    run=memory.ident(summary.get('runId'))
    synthetic=summary.get('synthetic')
    if type(synthetic) is not bool or (synthetic and not a.allow_synthetic): raise ValueError('Synthetic evidence requires explicit test-only flag')
    candidates=[]; summary_ref={'ref':'summary','sha256':digest(raw)}
    measures=summary.get('measurements',{})
    stages=measures.get('stages',[])
    if not isinstance(stages,list): raise ValueError('Invalid stage measurements')
    # Pin the exact source log referenced by the summary; hashes are freshness, not authorization.
    failure_stages=[s for s in stages if any(type(s.get(k)) is int and s[k]>0 for k in ['failedAttempts','recordedRetryAttempts','unfinishedAttempts'])]
    if failure_stages or measures.get('sourceStatus')=='present':
        logs=[e for e in summary.get('evidence',[]) if e.get('path')=='output/metrics/stage-events.jsonl' and e.get('status')=='present']
        if len(logs)!=1 or digest(safe_file(project,logs[0]['path']))!=logs[0].get('sha256'):
            raise ValueError('Summary stage-log evidence missing or stale; regenerate summary from authorized existing logs')
        if measures.get('sourceStatus')!='present': raise ValueError('Stage measurements lack source evidence')
        verify_stage_log(safe_file(project,logs[0]['path']),run,stages)
    for stage in stages:
        if stage.get('stage') not in STAGES: raise ValueError('Unknown stage; review adapter before importing')
        for field,label in [('failedAttempts','failure'),('recordedRetryAttempts','retry'),('unfinishedAttempts','missing-terminal')]:
            count=stage.get(field)
            if count is not None and (type(count) is not int or count<0): raise ValueError('Invalid observation count')
            if count:
                candidates.append({'stage':stage['stage'],'checkId':'stage-'+stage['stage']+'-'+label,
                    'source':'objective-check','action':'verify-regression' if label!='missing-terminal' else 'review-before-next-run',
                    'target':None,'evidence':[summary_ref,{'ref':'stage-log','sha256':logs[0]['sha256']}],
                    'observation':{'kind':label,'count':count},'confidence':0.6})
    if a.observations:
        obs_raw=safe_file(project,a.observations); observations=json.loads(obs_raw)
        if not isinstance(observations,dict) or set(observations)!={'schema','runId','items','evidenceIndex'} or observations['schema']!=1 or observations['runId']!=run:
            raise ValueError('Observations require schema 1 and matching runId')
        if not isinstance(observations['items'],list) or len(observations['items'])>100: raise ValueError('At most 100 minimal observations')
        index=observations['evidenceIndex']
        if not isinstance(index,list) or len(index)>100: raise ValueError('Bounded explicit evidence index required')
        verified={}
        for ev in index:
            if not isinstance(ev,dict) or set(ev)!={'ref','path','sha256'}: raise ValueError('Evidence index requires ref/path/sha256')
            memory.ident(ev['ref'])
            if ev['ref'] in verified: raise ValueError('Duplicate evidence reference')
            if digest(safe_file(project,ev['path']))!=ev['sha256']: raise ValueError('Observation evidence is stale or mismatched')
            verified[ev['ref']]=ev['sha256']
        for obs in observations['items']:
            if set(obs)!={'checkId','stage','source','result','action','target','evidence'}: raise ValueError('Unexpected observation fields; no raw text/commands allowed')
            memory.ident(obs['checkId'])
            if obs['stage'] not in STAGES or obs['source'] not in ['user-feedback','objective-check','agent-inference'] or obs['result'] not in ['failed','change-requested','unknown','passed','accepted-pattern','successful-check'] or obs['action'] not in ACTIONS:
                raise ValueError('Invalid typed observation')
            if obs['result']=='accepted-pattern' and obs['source']!='user-feedback':raise ValueError('Only explicit user feedback may claim an accepted pattern')
            if obs['result']=='successful-check' and obs['source']!='objective-check':raise ValueError('Successful check needs objective-check source')
            if obs['action']=='reuse-reviewed-pattern' and obs['result'] not in ['accepted-pattern','successful-check']:raise ValueError('Pattern reuse requires explicit successful evidence')
            target=obs['target']
            if obs['action']=='propose-core-change':
                if not isinstance(target,str) or not re.fullmatch(r'(SKILL\.md|references/[A-Z0-9_-]+\.md)',target): raise ValueError('Core target must be a reviewable Skill/reference path, never code execution')
            elif target is not None: raise ValueError('Only core-change proposals may name a target')
            ev=obs['evidence']
            if not isinstance(ev,dict) or set(ev)!={'ref','sha256'}: raise ValueError('Minimal evidence reference/digest required')
            memory.ident(ev['ref'])
            if not isinstance(ev['sha256'],str) or not re.fullmatch('[a-f0-9]{64}',ev['sha256']): raise ValueError('Invalid evidence hash')
            if verified.get(ev['ref'])!=ev['sha256']: raise ValueError('Observation evidence not verified against an actual authorized file')
            if obs['result']=='passed': continue # Success is not a new lesson or approval.
            candidates.append({k:obs[k] for k in ['stage','checkId','source','action','target']} | {
                'evidence':[summary_ref,{'ref':'observations','sha256':digest(obs_raw)},ev],
                'observation':{'kind':obs['result'],'count':1},'confidence':0.4 if obs['source']=='agent-inference' else 0.7})
    created=[];duplicates=[]
    for candidate in candidates:
        fingerprint=digest(json.dumps({'project':a.project,'run':run,**candidate},sort_keys=True,separators=(',',':')).encode())
        existing=next((x for x in db['lessons'] if x['fingerprint']==fingerprint),None)
        if existing: duplicates.append(existing['id']);continue
        prior=[x for x in db['lessons'] if x['project']==a.project and x['checkId']==candidate['checkId'] and x['stage']==candidate['stage']]
        item={**candidate,'id':'l'+uuid.uuid4().hex,'version':max([x['version'] for x in prior],default=0)+1,
              'project':a.project,'scope':'project','runId':run,'status':'pending','synthetic':synthetic,
              'authorizationRef':a.authorization_ref,'createdAt':now(),'supersedes':None,'fingerprint':fingerprint}
        db['lessons'].append(item);created.append(compact(item))
    return {'schema':1,'status':'candidates-only','runId':run,'synthetic':synthetic,'created':created,'deduplicated':duplicates,
            'unknown':['Root cause','Causal improvement','Media quality','Unrecorded work'],
            'coreChangesApplied':False,'humanAuthorizationVerified':False}

def comparison(a,item=None):
    snapshots=[]
    for label in ['baseline','candidate']:
        root=Path(getattr(a,label+'_root'))
        if not root.is_absolute() or '..' in root.parts: raise ValueError('Comparison roots must be explicit absolute authorized directories')
        memory.no_links(root);root=root.resolve()
        raw=safe_file(root,getattr(a,label+'_summary'));summary=json.loads(raw)
        if summary.get('schema')!=1 or summary.get('kind')!='deterministic-review-summary':raise ValueError('Invalid comparison summary')
        if type(summary.get('synthetic')) is not bool:raise ValueError('Comparison synthetic flag must be boolean')
        if summary['synthetic'] and not a.allow_synthetic:raise ValueError('Synthetic comparison requires test-only flag')
        run=memory.ident(summary.get('runId'))
        log_entry=next((e for e in summary.get('evidence',[]) if e.get('path')=='output/metrics/stage-events.jsonl' and e.get('status')=='present'),None)
        log=safe_file(root,'output/metrics/stage-events.jsonl')
        if not log_entry or digest(log)!=log_entry.get('sha256'):raise ValueError('Comparison stage log missing or stale')
        coverage=verify_stage_log(log,run,summary['measurements']['stages'])
        for field in ['invalidLines','conflictingEventCount']:
            value=summary['measurements'].get(field)
            if type(value) is not int or value!=0:
                raise ValueError('Comparison inconclusive: invalid or conflicting log records')
        snapshots.append({'root':root,'runId':run,'summarySha256':digest(raw),'logSha256':digest(log),
            'coverage':coverage,
            'artifactSha256':digest(safe_file(root,getattr(a,label+'_artifact'))),
            'caseSetSha256':digest(safe_file(root,a.case_set)),
            'evaluatorSha256':digest(safe_file(root,a.evaluator)),
            'failedAttempts':sum(s['failedAttempts'] for s in summary['measurements']['stages']),
            'stageFailures':{s['stage']:s['failedAttempts'] for s in summary['measurements']['stages']},
            'synthetic':summary.get('synthetic')})
    baseline,candidate=snapshots
    if baseline['root']==candidate['root'] or baseline['root'] in candidate['root'].parents or candidate['root'] in baseline['root'].parents:
        raise ValueError('Baseline and candidate must be distinct non-nested authorized snapshots')
    if baseline['runId']==candidate['runId']:raise ValueError('Candidate must be another run')
    if item is not None:
        if baseline['runId']!=item['runId']:raise ValueError('Baseline must match lesson origin')
        if baseline['summarySha256']!=item['evidence'][0]['sha256']:raise ValueError('Baseline differs from original lesson evidence')
    if baseline['synthetic']!=candidate['synthetic']:raise ValueError('Cannot mix synthetic and production evidence')
    context=getattr(a,'execution_context',None)
    if context is not None:
        for snapshot in snapshots:
            context_raw=safe_file(snapshot['root'],context)
            if not context_raw.strip():raise ValueError('Execution context must not be empty')
            snapshot['executionContextSha256']=digest(context_raw)
        if baseline['executionContextSha256']!=candidate['executionContextSha256']:raise ValueError('Comparison requires matched execution context')
    for key in ['caseSetSha256','evaluatorSha256']:
        if baseline[key]!=candidate[key]:raise ValueError('Candidate changed the case set or evaluator; independent comparison rejected')
    for snapshot in snapshots:
        coverage=snapshot['coverage']
        if coverage['unknownEvents'] or coverage['unfinishedAttempts'] or not coverage['terminalAttempts']:
            raise ValueError('Comparison inconclusive: missing terminal execution, unknown events, or incomplete coverage')
    if not set(baseline['coverage']['completedWorkloadIds']).issubset(candidate['coverage']['completedWorkloadIds']):
        raise ValueError('Comparison inconclusive: candidate lacks baseline completed workload coverage')
    for snapshot in snapshots:del snapshot['root']
    regressions=[stage for stage,count in candidate['stageFailures'].items() if count>baseline['stageFailures'].get(stage,0)]
    return {'id':'c'+uuid.uuid4().hex,'lessonId':item['id'] if item else None,'lessonVersion':item['version'] if item else None,
        'candidateLessonSha256':digest(json.dumps(compact(item),sort_keys=True,separators=(',',':')).encode()) if item else None,
        'regressedStages':sorted(regressions),
        'baseline':baseline,'candidate':candidate,'createdAt':now(),
        'finding':'recorded-stage-regression' if regressions else 'recorded-failures-decreased' if candidate['failedAttempts']<baseline['failedAttempts'] else 'no-recorded-failure-decrease',
        'limits':['Observed command results only; no causal or aesthetic score','Artifact hashes bind bytes, not correctness','Case set independence and evaluator trust require human review','No acceptance, approval, or core edit is granted'],
        'coreChangesApplied':False,'lessonStatusUnchanged':True}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',required=True)
    sub=p.add_subparsers(dest='command',required=True)
    for name in ['enable-cycle','disable-cycle','task-end','review','approve','retrieve','revoke','forget','compare']:
        q=sub.add_parser(name);q.add_argument('--user',required=True);q.add_argument('--project',required=True)
        if name=='task-end':
            q.add_argument('--project-root',required=True);q.add_argument('--summary',required=True)
            q.add_argument('--observations');q.add_argument('--authorization-ref',required=True)
        if name in ['task-end','approve','revoke','forget','enable-cycle','disable-cycle','compare']:q.add_argument('--confirmed',action='store_true',required=name!='task-end')
        if name in ['enable-cycle','disable-cycle']:q.add_argument('--authorization-ref',required=True)
        if name=='enable-cycle':q.add_argument('--scope',choices=['project','user'],default='project')
        if name in ['task-end','approve','retrieve','compare']:q.add_argument('--allow-synthetic',action='store_true')
        if name in ['approve','revoke','compare']:q.add_argument('--id',required=True)
        if name=='approve':q.add_argument('--scope',choices=['project','user'],default='project')
        if name=='forget':q.add_argument('--check-id',required=True)
        if name=='compare':
            for label in ['baseline','candidate']:
                for field in ['root','summary','artifact']:q.add_argument('--'+label+'-'+field,required=True)
            q.add_argument('--case-set',required=True);q.add_argument('--evaluator',required=True)
    a=p.parse_args();root=memory.root_path(a.root);memory.ident(a.user);memory.ident(a.project)
    with memory.locked(root):
        config,target,db=load(root,a.user)
        if config.get('enabled') is not True and a.command not in ['review','revoke','forget','disable-cycle']:raise ValueError('Memory disabled')
        if a.command in ['enable-cycle','disable-cycle']:
            memory.ident(a.authorization_ref)
            policies=db.setdefault('cyclePolicies',[])
            if a.command=='enable-cycle':
                if any(x['authorizationRef']==a.authorization_ref for x in policies):raise ValueError('Use a new authorization reference; never silently overwrite a prior policy')
                policies.append({'authorizationRef':a.authorization_ref,'project':a.project,'scope':a.scope,'enabled':True,'event':'task-end','purpose':'propose-only','createdAt':now()})
            else:
                matches=[x for x in policies if x['authorizationRef']==a.authorization_ref and x['project']==a.project]
                if len(matches)!=1:raise ValueError('Cycle policy not found in origin project')
                matches[0]['enabled']=False
            save(target,db);return {'status':'enabled' if a.command=='enable-cycle' else 'disabled','event':'task-end','purpose':'propose-only','backgroundTaskCreated':False,'humanAuthorizationVerified':False}
        if a.command=='task-end':
            memory.ident(a.authorization_ref)
            policy=next((x for x in db.get('cyclePolicies',[]) if x['authorizationRef']==a.authorization_ref and x['enabled'] and (x['scope']=='user' or x['project']==a.project)),None)
            if not a.confirmed and policy is None:raise ValueError('Task-end needs explicit current authorization or an enabled scoped cycle policy')
            result=task_end(a,db);save(target,db);return result
        relevant=[x for x in db['lessons'] if x['project']==a.project or x['scope']=='user']
        if a.command=='review':return {'schema':1,'candidates':[compact(x)|{'observation':x['observation'],'authorizationRef':x['authorizationRef'],'comparisons':x.get('comparisons',[])} for x in relevant],
            'confirmationChecklist':['Verify evidence and source','Confirm project or explicit cross-project applicability','Specify regression check and inspect actual preview/check evidence','Core changes require separate reviewed diff and user approval'],
            'coreChangesApplied':False}
        if a.command=='retrieve':
            active={}
            for scope in ['user','project']:
                for x in relevant:
                    if x['scope']==scope and x['status']=='approved' and (not x['synthetic'] or a.allow_synthetic):active[(x['stage'],x['checkId'])]=x
            return {'schema':1,'user':a.user,'project':a.project,'executionChecklist':[compact(x)|{
                'requiresCurrentRequestCheck':True,'enforcement':'agent-review-only','userCanOverride':True,
                'nextAction':'Prepare a minimal proposed diff and failure-regression test; request explicit approval before changing core Skill' if x['action']=='propose-core-change' else 'Review prior successful evidence for applicability; propose reuse and validate a new representative preview, never copy acceptance' if x['action']=='reuse-reviewed-pattern' else 'Review this check and referenced evidence before the indicated stage; record actual regression result',
                'grantsExecutionPermission':False} for x in active.values()],
                'coreChangesApplied':False,'currentRequestWins':True}
        if a.command=='forget':
            memory.ident(a.check_id);before=len(db['lessons'])
            db['lessons']=[x for x in db['lessons'] if not (x['checkId']==a.check_id and (x['project']==a.project or x['scope']=='user'))]
            result={'status':'forgotten','removed':before-len(db['lessons'])}
        else:
            item=next((x for x in db['lessons'] if x['id']==a.id and x['project']==a.project),None)
            if not item:raise ValueError('Lesson not found in this user/origin project')
            if a.command=='compare':
                result=comparison(a,item);item.setdefault('comparisons',[]).append(result);save(target,db);return result
            if a.command=='approve':
                if item['status']!='pending':raise ValueError('Only pending lessons can be approved')
                if item['synthetic'] and not a.allow_synthetic:raise ValueError('Synthetic fixture cannot become production experience')
                prior=[x for x in db['lessons'] if x['status']=='approved' and x['checkId']==item['checkId'] and x['stage']==item['stage'] and x['scope']==a.scope and (a.scope=='user' or x['project']==a.project)]
                item.update(status='approved',scope=a.scope,approvedAt=now(),supersedes=prior[-1]['id'] if prior else None)
                db['lessons'].remove(item);db['lessons'].append(item)
            else:item.update(status='revoked',revokedAt=now())
            result={'status':item['status'],'id':item['id'],'version':item['version'],'humanAuthorizationVerified':False}
        save(target,db);return result

if __name__=='__main__':
    try:print(json.dumps(main(),ensure_ascii=False,indent=2))
    except (ValueError,OSError,KeyError,TypeError,AttributeError) as error:
        print('lesson-cycle: '+str(error),file=sys.stderr);sys.exit(1)

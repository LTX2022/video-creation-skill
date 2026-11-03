#!/usr/bin/env python3
"""Opt-in local typed preferences. No network, model, subprocess, or source editing."""
import argparse
import hashlib
import uuid
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta

ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$')
FIELDS = {'preferred_style': None, 'avoided_style': None,
          'pace': ['calm', 'balanced', 'brisk'],
          'narration': ['none', 'optional', 'preferred'],
          'context_mode': ['compact', 'standard'],
          'motion': ['restrained', 'balanced', 'expressive'],
          'layout': ['minimal', 'balanced', 'dense'],
          'palette': ['muted', 'vivid', 'monochrome'],
          'subtitle': ['none', 'concise', 'full'],
          'check_text': ['readability', 'overflow', 'content-fidelity'],
          'check_motion': ['continuity', 'motion-density'],
          'check_audio': ['sync', 'levels'],
          'check_timing': ['pacing', 'duration']}
ACTIONS = {
    'preferred_style':'Show matching style higher; ask user to select before design lock',
    'avoided_style':'Rank matching style lower; do not remove or prohibit current user choice',
    'pace':'Propose chapter duration and transition density for this pace; confirm fit before timing lock',
    'narration':'Ask whether to use narration; none suggests a silent plan, never removes requested audio',
    'context_mode':'Use compact status and the minimal relevant reference route when compact; do not skip checks',
    'motion':'Propose animation amplitude and transition density; show a representative preview before locking',
    'layout':'Propose whitespace and information density; preserve required facts and test legibility',
    'palette':'Propose a palette within the selected style; verify contrast and obtain design confirmation',
    'subtitle':'Confirm subtitle coverage with current request; preserve required accessibility and content',
    'check_text':'Before next preview, explicitly review the indicated text failure class and record evidence',
    'check_motion':'Before next preview, review continuous motion for the indicated failure class and record evidence',
    'check_audio':'Before next delivery, review the indicated audio failure class and record evidence',
    'check_timing':'Before timing lock and delivery, review the indicated timing failure class and record evidence'
}

def ident(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise ValueError('Expected opaque 1–64 character ID; no paths, prose, or secrets')
    return value

def no_links(path):
    for p in [path, *path.parents]:
        if p.is_symlink():
            raise ValueError('Symbolic links are not allowed')

def root_path(value):
    raw = Path(value)
    if not raw.is_absolute() or '..' in raw.parts:
        raise ValueError('Memory root must be an explicit absolute independent directory')
    no_links(raw)
    root = raw.resolve()
    bundle = Path(__file__).resolve().parents[2]
    if root == bundle or bundle in root.parents or root in bundle.parents:
        raise ValueError('Memory root must be outside the skill bundle')
    return root

def read(path):
    no_links(path)
    if path.stat().st_size > 2_000_000:
        raise ValueError('Memory file too large; review/archive explicitly')
    return json.loads(path.read_text(encoding='utf-8'))

def write(path, obj):
    no_links(path)
    payload = json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    if len(payload.encode('utf-8')) > 2_000_000:
        raise ValueError('Memory capacity reached; old store retained. Forget unneeded records before retrying')
    fd, tmp = tempfile.mkstemp(prefix='.memory-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(payload); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

@contextmanager
def locked(root):
    lock = root / '.write-lock'
    try: lock.mkdir(mode=0o700)
    except FileExistsError: raise ValueError('Memory busy; inspect stale lock before explicit recovery')
    try: yield
    finally: lock.rmdir()

def validate_record(record):
    if set(record) != {'key', 'value', 'evidence', 'confidence', 'source', 'scope'}:
        raise ValueError('Record requires exactly key,value,evidence,confidence,source,scope')
    key, value = record['key'], record['value']
    if key not in FIELDS: raise ValueError('Unsupported preference; procedural lessons remain review-only')
    ident(value)
    if FIELDS[key] is not None and value not in FIELDS[key]: raise ValueError('Unsupported value')
    if key.endswith('style') and not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', value):
        raise ValueError('Style value must be a catalogue ID, not prose')
    if record['source'] not in ['user-feedback', 'retrospective', 'objective-check', 'agent-inference']: raise ValueError('Untrusted material cannot be a preference source')
    if record['scope'] not in ['project', 'user']: raise ValueError('Scope must be project or user')
    if key.startswith('check_') and record['scope'] != 'project': raise ValueError('Experience checks must remain project-scoped')
    if type(record['confidence']) not in [float, int] or not 0 <= record['confidence'] <= 1:
        raise ValueError('Confidence must be between zero and one; it is not a quality score')
    ev = record['evidence']
    if not isinstance(ev, dict) or set(ev) != {'ref', 'sha256'}: raise ValueError('Evidence requires opaque ref and sha256 only; no raw text')
    ident(ev['ref'])
    if not isinstance(ev['sha256'], str) or not re.fullmatch('[a-f0-9]{64}', ev['sha256']): raise ValueError('Invalid evidence digest')

def load_store(root, user, allow_disabled=False):
    config = read(root / 'consent.json')
    if config.get('schema') != 1 or (config.get('enabled') is not True and not allow_disabled): raise ValueError('Memory disabled or invalid')
    ident(user)
    if user.lower() == 'consent': raise ValueError('User ID consent is reserved; choose another opaque ID')
    target = root / (user + '.json')
    db = read(target) if target.exists() else {'schema': 1, 'user': user, 'records': []}
    if db.get('schema') != 1 or db.get('user') != user or not isinstance(db.get('records'), list): raise ValueError('Invalid user store')
    for r in db['records']:
        validate_record({k:r[k] for k in ['key','value','evidence','confidence','source','scope']})
        ident(r['id']); ident(r['project'])
        if 'autoLearned' in r:
            if r['autoLearned'] is not True: raise ValueError('Invalid adaptive record')
            ident(r['consentRef']); timestamp(r['expiresAt'])
        if r['status'] not in ['pending','approved','revoked']: raise ValueError('Invalid record status')
    return target, db

def timestamp(value):
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None: raise ValueError('Timestamp must include timezone')
    return parsed


def learning_policy(db, project):
    policy = db.get('learningPolicies', {}).get(project)
    if policy is not None:
        if (not isinstance(policy, dict) or type(policy.get('enabled')) is not bool
                or not isinstance(policy.get('keys'), list) or not policy['keys']
                or any(k not in FIELDS for k in policy['keys'])
                or type(policy.get('minConfidence')) not in [int, float]
                or not 0.5 <= policy['minConfidence'] <= 1
                or type(policy.get('ttlDays')) is not int or not 1 <= policy['ttlDays'] <= 365):
            raise ValueError('Invalid adaptive learning policy')
        ident(policy['consentRef'])
    return policy


def validate_overrides(overrides):
    if not isinstance(overrides, dict): raise ValueError('Overrides must be a typed key/value object')
    for key, value in overrides.items():
        validate_record({'key':key, 'value':value, 'scope':'project', 'confidence':1,
                         'source':'user-feedback', 'evidence':{'ref':'current-request', 'sha256':'0'*64}})
    return overrides


def profile(db, project, overrides=None, now=None):
    # Latest confirmed record wins within a scope; project overrides explicitly global.
    now = now or datetime.now(timezone.utc)
    policy = learning_policy(db, project)
    active = {}
    for scope in ['user', 'project']:
        for r in db['records']:
            if r['status'] == 'approved' and r['scope'] == scope and (scope == 'user' or r['project'] == project):
                if r.get('autoLearned') and not (policy and policy['enabled'] and r['key'] in policy['keys'] and r['consentRef']==policy['consentRef']): continue
                active[r['key']] = r
    # Select latest before expiry filtering: stale newer evidence must not resurrect older values.
    expired = [k for k,r in active.items() if r.get('expiresAt') and timestamp(r['expiresAt']) <= now]
    for key in expired: del active[key]
    overrides = validate_overrides({} if overrides is None else overrides)
    overridden = {k:r['value'] for k,r in active.items() if k in overrides}
    for key in overrides: active.pop(key, None)
    result = {'schema': 1, 'user': db['user'], 'project': project,
            'preferences': {k:r['value'] for k,r in active.items()},
            'provenance': {k:{x:r[x] for x in ['id','scope','source','confidence','evidence','expiresAt','autoLearned','supersedes'] if x in r} for k,r in active.items()},
            'executionPlan': [
                {'key':k, 'value':r['value'], 'scope':r['scope'], 'source':r['source'],
                 'userCanOverride':True,
                 'enforcement':'candidate-ordering-only' if k.endswith('style') else 'agent-planning-hint-only',
                 'action':ACTIONS[k],
                 'kind':'experience-check' if k.startswith('check_') else 'preference',
                 'requiresCurrentRequestCheck':True, 'grantsRenderOrInstallPermission':False}
                for k,r in active.items()],
            'authority': 'hints-only; current request and quality/approval gates always win',
            'coreSkillChanges': 'not-applied',
            'learning': {'enabled':bool(policy and policy['enabled']), 'expiredKeys':expired,
                         'overriddenMemory':overridden, 'persistedCurrentRequest':False}}
    result['preferences'].update(overrides)
    for key,value in overrides.items():
        result['provenance'][key] = {'source':'current-request', 'scope':'request'}
        result['executionPlan'].append({'key':key, 'value':value, 'scope':'request',
            'source':'current-request', 'userCanOverride':True, 'action':ACTIONS[key],
            'enforcement':'candidate-ordering-only' if key.endswith('style') else 'agent-planning-hint-only',
            'kind':'experience-check' if key.startswith('check_') else 'preference',
            'requiresCurrentRequestCheck':True, 'grantsRenderOrInstallPermission':False})
    return result


def observe(record, db, project, evidence_path):
    validate_record(record)
    policy = learning_policy(db, project)
    if not policy or not policy['enabled']: raise ValueError('Adaptive learning not opted in for this user/project')
    if record['scope'] != 'project' or record['key'] not in policy['keys']:
        raise ValueError('Observation outside approved project/key scope')
    # Only read a caller-selected minimal evidence file, never scan transcripts or logs.
    path = Path(evidence_path)
    if not path.is_absolute(): raise ValueError('Evidence file must be an explicit absolute path')
    no_links(path)
    if not path.is_file() or path.stat().st_size > 100_000:
        raise ValueError('Evidence must be a minimal regular file of at most 100 KB')
    if hashlib.sha256(path.read_bytes()).hexdigest() != record['evidence']['sha256']:
        raise ValueError('Evidence digest mismatch; observation not retained')
    for old in db['records']:
        if (old['project']==project and old['scope']=='project' and old['key']==record['key']
                and old['value']==record['value'] and old['source']==record['source']
                and old['evidence']==record['evidence']):
            return {'status':'duplicate', 'id':old['id'], 'confidenceIncreased':False}
    eligible_source = ('objective-check' if record['key'].startswith('check_') else 'user-feedback')
    approved = record['source']==eligible_source and record['confidence'] >= policy['minConfidence']
    previous = [r for r in db['records'] if r['key']==record['key'] and r['scope']=='project'
                and r['project']==project and r['status']=='approved']
    now = datetime.now(timezone.utc)
    record.update(id='p'+uuid.uuid4().hex, project=project, createdAt=now.isoformat(),
                  status='approved' if approved else 'pending', autoLearned=True,
                  consentRef=policy['consentRef'], expiresAt=(now+timedelta(days=policy['ttlDays'])).isoformat(),
                  supersedes=previous[-1]['id'] if previous else None)
    if approved: record['approvedAt']=now.isoformat()
    db['records'].append(record)
    return {'status':record['status'], 'id':record['id'], 'expiresAt':record['expiresAt'],
            'supersedes':record['supersedes'], 'evidenceDigestVerified':True,
            'sourceAuthenticityVerified':False, 'coreSkillChanges':'not-applied'}


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', required=True)
    sub = p.add_subparsers(dest='command', required=True)
    init = sub.add_parser('init'); init.add_argument('--consent-ref', required=True); init.add_argument('--confirmed', action='store_true', required=True)
    for command in ['propose','approve','revoke','forget','profile','inspect','review','disable','observe','learning-enable','learning-disable','learning-status']:
        q = sub.add_parser(command)
        if command != 'disable':
            q.add_argument('--user', required=True); q.add_argument('--project', required=True)
        if command in ['propose','observe']: q.add_argument('--record', required=True)
        if command == 'observe': q.add_argument('--evidence-file', required=True)
        if command == 'profile': q.add_argument('--overrides', help='JSON object of current-request typed values; never saved')
        if command == 'learning-enable':
            q.add_argument('--keys', nargs='+', choices=list(FIELDS), required=True)
            q.add_argument('--consent-ref', required=True)
            q.add_argument('--min-confidence', type=float, default=0.8)
            q.add_argument('--ttl-days', type=int, default=90)
        if command in ['approve','revoke']: q.add_argument('--id', required=True)
        if command == 'forget': q.add_argument('--key', choices=list(FIELDS), required=True)
        if command in ['approve','revoke','forget','disable','learning-enable','learning-disable']: q.add_argument('--confirmed', action='store_true', required=True)
    a = p.parse_args(argv); root = root_path(a.root)
    if a.command == 'init':
        ident(a.consent_ref)
        if root.exists(): raise ValueError('Init requires a new directory, never adopts existing data')
        if not root.parent.is_dir(): raise ValueError('Memory parent must exist')
        root.mkdir(mode=0o700)
        write(root / 'consent.json', {'schema':1,'enabled':True,'consentRef':a.consent_ref})
        return {'status':'initialized','root':str(root),'humanAuthorizationVerified':False}
    if not root.is_dir(): raise ValueError('Memory not configured; continue without personalization')
    with locked(root):
        if a.command == 'disable':
            config = read(root / 'consent.json'); config['enabled'] = False; write(root/'consent.json',config)
            return {'status':'disabled','dataRetained':True}
        ident(a.project)
        target, db = load_store(root, a.user, allow_disabled=a.command in ['forget','inspect','revoke','review','learning-disable','learning-status'])
        if a.command == 'profile': return profile(db, a.project, json.loads(a.overrides) if a.overrides else None)
        if a.command == 'learning-status':
            return {'policy':learning_policy(db,a.project), 'scope':'project', 'backgroundWatcher':False}
        if a.command in ['learning-enable','learning-disable']:
            policies = db.setdefault('learningPolicies', {})
            if a.command == 'learning-enable':
                ident(a.consent_ref)
                policies[a.project] = {'enabled':True, 'keys':sorted(set(a.keys)),
                    'consentRef':a.consent_ref, 'minConfidence':a.min_confidence, 'ttlDays':a.ttl_days}
                learning_policy(db,a.project)
            elif a.project in policies: policies[a.project]['enabled'] = False
            write(target, db)
            return {'policy':policies.get(a.project), 'dataRetained':True, 'humanAuthorizationVerified':False}
        if a.command == 'observe':
            record = read(Path(a.record).absolute())
            result = observe(record, db, a.project, a.evidence_file)
            write(target, db)
            return result
        if a.command == 'review':
            candidates = [r for r in db['records'] if r['scope']=='user' or r['project']==a.project]
            return {'schema':1,'status':'suggestions-only','coreSkillChanges':'not-applied',
                    'recommendations':[{'recordId':r['id'],'evidence':r['evidence'],
                      'confidence':r['confidence'],'scope':r['scope'],'source':r['source'],'project':r['project'],
                      'kind':'experience-check' if r['key'].startswith('check_') else 'preference',
                      'candidateStatus':r['status'],
                      'proposedPreference':{r['key']:r['value']},
                      'proposedLocation':'external preference memory, NOT core SKILL.md',
                      'verification':('Confirm with user; compare next-task profile and actual candidate ordering; retain all original quality gates' if r['key'].endswith('style') else 'Confirm source/scope with user; compare next-task executionPlan and actual preview/check evidence; retain all original quality gates'),
                      'coreChangeApproval':'not-requested-not-authorized'} for r in candidates],
                    'coreChangePolicy':'For procedural changes, prepare a separate minimal diff with evidence and regression tests; obtain explicit user approval before editing core Skill. No apply command exists.'}
        if a.command == 'inspect':
            return {'schema':1,'records':[r for r in db['records'] if r['scope']=='user' or r['project']==a.project]}
        if a.command == 'propose':
            record_path = Path(a.record).absolute(); no_links(record_path)
            record = read(record_path); validate_record(record)
            previous = [r for r in db['records'] if r['key']==record['key'] and r['scope']==record['scope']
                        and (r['scope']=='user' or r['project']==a.project) and r['status']=='approved']
            record['supersedes'] = previous[-1]['id'] if previous else None
            # Unique IDs survive forgetting; duplicates never inflate confidence.
            record.update(id='p'+uuid.uuid4().hex,project=a.project,status='pending',createdAt=datetime.now(timezone.utc).isoformat())
            db['records'].append(record); result = record
        elif a.command == 'forget':
            count = 0
            for r in db['records']:
                if r['key']==a.key and (r['scope']=='user' or r['project']==a.project):
                    # Remove evidence/value too. No hidden copy or audit payload retained.
                    count += 1
            db['records'] = [r for r in db['records'] if not (r['key']==a.key and (r['scope']=='user' or r['project']==a.project))]
            result = {'status':'forgotten','removed':count}
        else:
            matches = [r for r in db['records'] if r['id']==a.id and r['project']==a.project]
            if len(matches)!=1: raise ValueError('Record not found in this user/project')
            r = matches[0]
            if a.command=='approve' and r['status']!='pending': raise ValueError('Only pending candidates can be confirmed')
            if a.command == 'approve':
                prior = [item for item in db['records'] if item['status']=='approved' and item['key']==r['key']
                         and item['scope']==r['scope'] and (r['scope']=='user' or item['project']==r['project'])]
                r['supersedes'] = prior[-1]['id'] if prior else None
                r['approvedAt'] = datetime.now(timezone.utc).isoformat()
                db['records'].remove(r); db['records'].append(r)
            r['status'] = 'approved' if a.command=='approve' else 'revoked'
            result = {'status':r['status'],'id':r['id'],'humanAuthorizationVerified':False}
        write(target,db)
        return result

if __name__ == '__main__':
    try: print(json.dumps(main(),ensure_ascii=False,indent=2))
    except (ValueError, OSError, KeyError, TypeError) as e:
        print('preference-memory: '+str(e),file=sys.stderr); sys.exit(1)

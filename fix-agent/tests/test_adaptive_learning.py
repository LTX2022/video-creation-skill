"""Opt-in adaptive state and real CLI behavior, no network or model claims."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone, timedelta

CLI = Path(__file__).resolve().parents[1] / 'scripts/preference_memory.py'
spec = importlib.util.spec_from_file_location('adaptive_memory', CLI)
memory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(memory)

class AdaptiveLearningTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.root = self.base/'memory'
        self.evidence = self.base/'evidence.txt'
        self.evidence.write_text('User explicitly prefers calm pacing for this project.')
        self.record = self.base/'record.json'
        self.call('init','--consent-ref','storage-consent','--confirmed')

    def call(self, command, *args, user='alice', project='project-a', ok=True):
        scope = [] if command in ['init','disable'] else ['--user',user,'--project',project]
        result = subprocess.run([sys.executable,str(CLI),'--root',str(self.root),command,*scope,*args],capture_output=True,text=True)
        self.assertEqual(result.returncode == 0, ok, result.stderr)
        return json.loads(result.stdout) if ok else result.stderr

    def enable(self, *keys, **kw):
        return self.call('learning-enable','--keys',*(keys or ['pace','check_text']),
                         '--consent-ref','bounded-consent','--confirmed',**kw)

    def observe(self, value='calm', key='pace', source='user-feedback', confidence=0.9, scope='project', ref='feedback-1', **kw):
        record = {'key':key,'value':value,'scope':scope,'source':source,'confidence':confidence,
                  'evidence':{'ref':ref,'sha256':hashlib.sha256(self.evidence.read_bytes()).hexdigest()}}
        self.record.write_text(json.dumps(record))
        return self.call('observe','--record',str(self.record),'--evidence-file',str(self.evidence),**kw)

    def prefs(self, **kw): return self.call('profile',**kw)['preferences']

    def test_disabled_by_default_and_explicit_scope(self):
        self.observe(ok=False)
        self.call('learning-enable','--keys','pace','--consent-ref','c',ok=False)
        self.enable('pace')
        self.observe(key='layout',value='minimal',ok=False)
        self.observe(scope='user',ok=False)
        self.observe(user='bob',ok=False)
        self.observe(project='project-b',ok=False)
        self.assertEqual(self.call('learning-status')['policy']['keys'],['pace'])

    def test_two_rounds_conflicts_dedup_and_revoke(self):
        self.enable()
        first = self.observe()
        self.assertEqual(first['status'],'approved')
        self.assertEqual(self.prefs(),{'pace':'calm'})
        self.assertEqual(self.observe(confidence=1)['status'],'duplicate')
        self.assertEqual(self.call('profile')['provenance']['pace']['confidence'],0.9)
        second = self.observe(value='brisk',ref='feedback-2')
        self.assertEqual(second['supersedes'],first['id'])
        self.assertEqual(self.prefs(),{'pace':'brisk'})
        self.call('revoke','--id',second['id'],'--confirmed')
        self.assertEqual(self.prefs(),{'pace':'calm'})
        self.assertEqual(self.observe(value='brisk',ref='feedback-2')['status'],'duplicate')
        self.assertEqual(self.prefs(),{'pace':'calm'})

    def test_inference_low_confidence_and_wrong_source_never_auto_apply(self):
        self.enable()
        for source, confidence in [('agent-inference',1),('retrospective',1),('objective-check',1),('user-feedback',0.4)]:
            result = self.observe(source=source,confidence=confidence,ref=source+str(confidence))
            self.assertEqual(result['status'],'pending')
        self.assertEqual(self.prefs(),{})
        result = self.observe(value='overflow',key='check_text',source='objective-check')
        self.assertEqual(result['status'],'approved')
        self.assertEqual(self.call('profile')['executionPlan'][0]['kind'],'experience-check')
        self.assertFalse(result['sourceAuthenticityVerified'])

    def test_overrides_are_ephemeral_and_typed(self):
        self.enable(); self.observe()
        before = (self.root/'alice.json').read_bytes()
        result = self.call('profile','--overrides','{"pace":"brisk","layout":"minimal"}')
        self.assertEqual(result['preferences'],{'pace':'brisk','layout':'minimal'})
        self.assertEqual(result['learning']['overriddenMemory'],{'pace':'calm'})
        self.assertEqual(result['provenance']['pace']['source'],'current-request')
        self.assertEqual((self.root/'alice.json').read_bytes(),before)
        self.call('profile','--overrides','{"shell":"execute"}',ok=False)
        self.assertEqual(self.prefs(),{'pace':'calm'})

    def test_expiry_does_not_resurrect_older_conflicting_value(self):
        self.enable(); self.observe(); self.observe(value='brisk',ref='feedback-2')
        db = json.loads((self.root/'alice.json').read_text())
        db['records'][-1]['expiresAt'] = (datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()
        result = memory.profile(db,'project-a')
        self.assertEqual(result['preferences'],{})
        self.assertEqual(result['learning']['expiredKeys'],['pace'])

    def test_optout_stops_collection_and_application_but_allows_forget(self):
        self.enable(); self.observe()
        self.call('learning-disable','--confirmed')
        self.assertEqual(self.prefs(),{})
        self.observe(value='brisk',ok=False)
        self.assertEqual(len(self.call('inspect')['records']),1)
        self.call('forget','--key','pace','--confirmed')
        self.assertEqual(self.call('inspect')['records'],[])

    def test_policy_narrowing_does_not_apply_old_keys(self):
        self.enable(); self.observe()
        self.enable('check_text')
        self.assertEqual(self.prefs(),{})

    def test_digest_mismatch_and_invalid_limits_leave_store_unchanged(self):
        self.enable(); self.observe()
        before = (self.root/'alice.json').read_bytes()
        record = json.loads(self.record.read_text()); record['evidence']['sha256']='0'*64
        self.record.write_text(json.dumps(record))
        self.call('observe','--record',str(self.record),'--evidence-file',str(self.evidence),ok=False)
        for flag,value in [('--ttl-days','0'),('--ttl-days','366'),('--min-confidence','nan'),('--min-confidence','0.1')]:
            self.call('learning-enable','--keys','pace','--consent-ref','c','--confirmed',flag,value,ok=False)
        self.assertEqual((self.root/'alice.json').read_bytes(),before)

    def test_reenable_new_consent_does_not_replay_old_evidence(self):
        self.enable(); first = self.observe()
        self.call('learning-disable','--confirmed')
        self.call('learning-enable','--keys','pace','--consent-ref','new-consent','--confirmed')
        self.assertEqual(self.observe()['status'],'duplicate')
        self.assertEqual(self.prefs(),{})
        fresh = self.observe(ref='new-feedback')
        self.assertNotEqual(fresh['id'],first['id'])
        self.assertEqual(self.prefs(),{'pace':'calm'})

    def test_digest_is_not_semantic_or_user_authentication(self):
        self.enable()
        # Evidence text says calm. A caller can mislabel it: engine must not claim
        # semantic verification, and adapters must verify interpretation BEFORE calling.
        result = self.observe(value='brisk')
        self.assertTrue(result['evidenceDigestVerified'])
        self.assertFalse(result['sourceAuthenticityVerified'])
        self.assertEqual(result['coreSkillChanges'],'not-applied')

    def test_real_recommendation_consumer_uses_automatic_learning(self):
        style = CLI.parents[2]/'web-video-presentation/scripts/style-recommendations.mjs'
        def recommend(use_memory):
            args = ['node',str(style),'--all']
            if use_memory:
                args += ['--memory-root='+str(self.root),'--memory-user=alice',
                         '--memory-project=project-a','--memory-tool='+str(CLI)]
            result = subprocess.run(args,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            return json.loads(result.stdout)
        baseline = recommend(False)['sections'][0]['items']
        self.assertGreater(len(baseline),1)
        self.enable('preferred_style')
        self.observe(value=baseline[-1]['id'],key='preferred_style')
        ranked = recommend(True)['sections'][0]['items']
        self.assertEqual(ranked[0]['id'],baseline[-1]['id'])
        self.assertEqual(len(ranked),len(baseline))
        self.call('learning-disable','--confirmed')
        self.assertEqual([x['id'] for x in recommend(True)['sections'][0]['items']], [x['id'] for x in baseline])

    def test_global_disable_blocks_learning_enable_and_observe(self):
        self.enable(); self.call('disable','--confirmed')
        self.enable(ok=False); self.observe(ok=False)
        self.call('learning-disable','--confirmed')
        self.assertFalse(self.call('learning-status')['policy']['enabled'])

if __name__ == '__main__': unittest.main()

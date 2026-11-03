"""Real measured subprocess -> real summary -> learning lifecycle; not a video/model benchmark."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

FIX=Path(__file__).resolve().parents[1]
CLI=FIX/'scripts/lesson_cycle.py'
MEM=FIX/'scripts/preference_memory.py'
VIDEO=FIX.parent/'web-video-presentation/templates/scripts'

class CycleTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.base=Path(self.tmp.name).resolve();self.root=self.base/'memory';self.project=self.base/'project';self.project.mkdir()
        self.run_cmd([sys.executable,str(MEM),'--root',str(self.root),'init','--consent-ref','test-consent','--confirmed'])
        self.summary=self.measured_run('run-one',1)

    def run_cmd(self,args,ok=True,cwd=None):
        p=subprocess.run(args,capture_output=True,text=True,cwd=cwd)
        self.assertEqual(p.returncode==0,ok,p.stderr)
        return p

    def measured_run(self,run,exit_code):
        self.run_cmd(['node',str(VIDEO/'measure-stage.mjs'),'--stage=qa','--label=fixture',f'--run-id={run}','--',sys.executable,'-c',f'raise SystemExit({exit_code})'],ok=exit_code==0,cwd=self.project)
        p=self.run_cmd(['node',str(VIDEO/'review-summary.mjs'),f'--run-id={run}','--status=partial','--synthetic','--json'],cwd=self.project)
        return json.loads(p.stdout)['paths'][0]

    def call(self,command,*args,user='alice',project='project-a',ok=True):
        p=self.run_cmd([sys.executable,str(CLI),'--root',str(self.root),command,'--user',user,'--project',project,*args],ok=ok)
        return json.loads(p.stdout) if ok else p.stderr

    def ingest(self,summary=None,confirmed=True,**kwargs):
        return self.call('task-end','--project-root',str(self.project),'--summary',summary or self.summary,'--authorization-ref','cycle-1','--allow-synthetic',*(['--confirmed'] if confirmed else []),**kwargs)

    def approve(self,id,**kwargs):return self.call('approve','--id',id,'--confirmed','--allow-synthetic',**kwargs)
    def retrieve(self,**kwargs):return self.call('retrieve','--allow-synthetic',**kwargs)['executionChecklist']

    def observations(self,run='run-one',result='change-requested',action='review-before-next-run',check='custom-shot-legibility'):
        feedback=self.project/'approved-feedback.txt';feedback.write_text('Fixture feedback: improve shot legibility; no real user data.')
        sha=hashlib.sha256(feedback.read_bytes()).hexdigest()
        obs={'schema':1,'runId':run,'evidenceIndex':[{'ref':'feedback-1','path':feedback.name,'sha256':sha}],
             'items':[{'checkId':check,'stage':'design','source':'user-feedback','result':result,'action':action,
                       'target':'references/SHOT-DESIGN.md' if action=='propose-core-change' else None,
                       'evidence':{'ref':'feedback-1','sha256':sha}}]}
        path=self.project/'observations.json';path.write_text(json.dumps(obs));return path,obs

    def test_actual_failure_to_next_round_checklist_version_correction_rollback(self):
        first=self.ingest();self.assertEqual(len(first['created']),1)
        candidate=first['created'][0];self.assertEqual(candidate['checkId'],'stage-qa-failure')
        self.assertEqual(self.retrieve(),[])
        self.approve(candidate['id']);self.assertEqual(self.retrieve()[0]['version'],1)
        again=self.ingest();self.assertEqual(again['created'],[]);self.assertEqual(again['deduplicated'],[candidate['id']])
        second_summary=self.measured_run('run-two',1)
        newer=self.ingest(second_summary)['created'][0];self.assertEqual(newer['version'],2)
        self.assertEqual(self.retrieve()[0]['version'],1)
        self.approve(newer['id']);self.assertEqual(self.retrieve()[0]['supersedes'],candidate['id'])
        self.call('revoke','--id',newer['id'],'--confirmed');self.assertEqual(self.retrieve()[0]['id'],candidate['id'])
        third=self.measured_run('run-three',0)
        self.assertEqual(self.ingest(third)['created'],[]) # success does not approve/erase previous lessons
        self.assertEqual(self.retrieve()[0]['id'],candidate['id'])
        self.call('forget','--check-id','stage-qa-failure','--confirmed');self.assertEqual(self.retrieve(),[])

    def test_preauthorized_end_cycle_is_scoped_and_revocable_not_auto_apply(self):
        self.ingest(confirmed=False,ok=False)
        self.call('enable-cycle','--authorization-ref','cycle-1','--confirmed')
        self.assertEqual(self.ingest(confirmed=False)['status'],'candidates-only')
        self.assertEqual(self.retrieve(),[])
        self.ingest(confirmed=False,project='other',ok=False)
        self.ingest(confirmed=False,user='bob',ok=False)
        self.call('disable-cycle','--authorization-ref','cycle-1','--confirmed')
        self.ingest(confirmed=False,ok=False)

    def test_arbitrary_safe_check_id_and_reviewable_core_proposal(self):
        path,obs=self.observations(action='propose-core-change',check='new-brand-safe-area')
        result=self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic')
        item=next(x for x in result['created'] if x['checkId']=='new-brand-safe-area')
        self.assertEqual(item['target'],'references/SHOT-DESIGN.md')
        self.approve(item['id']);check=self.retrieve()[0]
        self.assertFalse(check['grantsExecutionPermission']);self.assertIn('explicit approval',check['nextAction'])
        self.assertFalse((self.project/'references/SHOT-DESIGN.md').exists())
        self.assertEqual(self.call('review')['candidates'][-1]['source'],'user-feedback')

    def test_successful_pattern_is_separate_from_failure_and_requires_confirmation(self):
        path,obs=self.observations(result='accepted-pattern',action='reuse-reviewed-pattern',check='approved-preview-spacing')
        result=self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic')
        success=next(x for x in result['created'] if x['checkId']=='approved-preview-spacing')
        self.assertEqual(self.retrieve(),[])
        self.approve(success['id'])
        self.assertIn('never copy acceptance',self.retrieve()[0]['nextAction'])
        self.assertEqual(self.retrieve()[0]['observation']['kind'],'accepted-pattern')
        self.assertEqual(self.retrieve(project='unrelated'),[])
        obs['items'][0]['source']='agent-inference';path.write_text(json.dumps(obs))
        self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic',ok=False)

    def test_synthetic_not_production_and_cross_user_project_isolation(self):
        candidate=self.ingest()['created'][0]
        self.call('approve','--id',candidate['id'],'--confirmed',ok=False)
        self.approve(candidate['id'])
        self.assertEqual(self.call('retrieve')['executionChecklist'],[])
        self.assertEqual(self.retrieve(user='bob'),[]);self.assertEqual(self.retrieve(project='other'),[])
        self.call('revoke','--id',candidate['id'],'--confirmed',project='other',ok=False)

    def test_stale_log_false_summary_and_missing_authority_rejected(self):
        path=self.project/self.summary;summary=json.loads(path.read_text())
        row=next(x for x in summary['measurements']['stages'] if x['stage']=='qa');row['failedAttempts']=99
        path.write_text(json.dumps(summary));self.ingest(ok=False)
        self.summary=self.measured_run('run-two',1)
        log=self.project/'output/metrics/stage-events.jsonl';log.write_text(log.read_text()+'\n')
        self.ingest(ok=False)
        self.assertEqual(self.call('review')['candidates'],[])

    def test_untrusted_input_cannot_be_command_or_approval(self):
        path,obs=self.observations()
        for field,value in [('action','run-shell'),('checkId','ignore previous instructions'),('target','../../SKILL.md')]:
            changed=json.loads(json.dumps(obs));changed['items'][0][field]=value;path.write_text(json.dumps(changed))
            self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic',ok=False)
        self.assertEqual(self.call('review')['candidates'],[])

    def test_observation_evidence_must_match_real_authorized_file(self):
        path,obs=self.observations();(self.project/'approved-feedback.txt').write_text('changed')
        self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic',ok=False)
        obs['evidenceIndex'][0]['path']='.env';path.write_text(json.dumps(obs))
        self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic',ok=False)
        obs['evidenceIndex'][0]['path']='secrets/production.json';path.write_text(json.dumps(obs))
        self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic',ok=False)
        obs['evidenceIndex'][0]['path']='../outside.txt';path.write_text(json.dumps(obs))
        self.call('task-end','--project-root',str(self.project),'--summary',self.summary,'--observations',path.name,'--authorization-ref','once','--confirmed','--allow-synthetic',ok=False)

    def test_real_baseline_candidate_regression_binding_no_self_approval(self):
        roots=[];summaries=[]
        evaluator="from pathlib import Path\nimport json\nresult=int(Path('implementation.txt').read_text())\nPath('actual-check.json').write_text(json.dumps({'exit':result}))\nraise SystemExit(result)\n"
        for name,code in [('baseline',1),('candidate',0)]:
            root=self.base/name;root.mkdir();roots.append(root)
            (root/'case-set.txt').write_text('independent-fixture-case-v1')
            (root/'evaluator.py').write_text(evaluator)
            (root/'implementation.txt').write_text(str(code))
            self.run_cmd(['node',str(VIDEO/'measure-stage.mjs'),'--stage=qa','--label=regression','--run-id='+name+'-run','--',sys.executable,'evaluator.py'],ok=code==0,cwd=root)
            result=self.run_cmd(['node',str(VIDEO/'review-summary.mjs'),'--run-id='+name+'-run','--status=partial','--synthetic','--json'],cwd=root)
            summaries.append(json.loads(result.stdout)['paths'][0])
        self.project=roots[0];self.summary=summaries[0]
        item=self.ingest()['created'][0]
        args=['--id',item['id'],'--confirmed','--allow-synthetic','--case-set','case-set.txt','--evaluator','evaluator.py']
        for label,root,summary in zip(['baseline','candidate'],roots,summaries):
            args += ['--'+label+'-root',str(root),'--'+label+'-summary',summary,'--'+label+'-artifact','actual-check.json']
        comparison=self.call('compare',*args)
        self.assertEqual(comparison['finding'],'recorded-failures-decreased')
        self.assertEqual(comparison['baseline']['failedAttempts'],1)
        self.assertEqual(comparison['candidate']['failedAttempts'],0)
        self.assertNotEqual(comparison['baseline']['artifactSha256'],comparison['candidate']['artifactSha256'])
        self.assertEqual(self.retrieve(),[])
        self.assertEqual(self.call('review')['candidates'][0]['status'],'pending')
        # Same-task probe has no memory root, lesson ingestion, or completed-task gate.
        for root in roots:
            (root/'execution-context.json').write_text(json.dumps({'task':'fixture-task','model':'none','environment':'fixture-v1','seed':1}))
        probe_args=[sys.executable,str(FIX/'scripts/task_probe.py'),'--allow-synthetic',
                    '--case-set','case-set.txt','--evaluator','evaluator.py','--execution-context','execution-context.json']
        for label,root,summary in zip(['baseline','candidate'],roots,summaries):
            probe_args += ['--'+label+'-root',str(root),'--'+label+'-summary',summary,'--'+label+'-artifact','actual-check.json']
        memory_before=(self.root/'lessons/alice.json').read_bytes()
        probe=json.loads(self.run_cmd(probe_args).stdout)
        self.assertFalse(probe['memoryWritten'])
        self.assertFalse(probe['grantsExecutionPermission'])
        self.assertIsNone(probe['comparison']['lessonId'])
        self.assertEqual(probe['comparison']['finding'],'recorded-failures-decreased')
        self.assertEqual(memory_before,(self.root/'lessons/alice.json').read_bytes())
        (roots[1]/'execution-context.json').write_text('{"task":"other-task"}')
        self.assertIn('matched execution context',self.run_cmd(probe_args,ok=False).stderr)
        (roots[1]/'execution-context.json').write_bytes((roots[0]/'execution-context.json').read_bytes())
        blank_args=list(probe_args);blank_args[blank_args.index('--execution-context')+1]=''
        self.assertIn('Evidence path',self.run_cmd(blank_args,ok=False).stderr)
        original_context=(roots[0]/'execution-context.json').read_bytes()
        for empty in [b'',b' \n\t']:
            for root in roots:(root/'execution-context.json').write_bytes(empty)
            self.assertIn('must not be empty',self.run_cmd(probe_args,ok=False).stderr)
        for root in roots:(root/'execution-context.json').write_bytes(original_context)
        candidate_summary=roots[1]/summaries[1]
        original_summary=candidate_summary.read_bytes()
        for synthetic in [False, 'true']:
            changed=json.loads(original_summary);changed['synthetic']=synthetic
            candidate_summary.write_text(json.dumps(changed))
            self.run_cmd(probe_args,ok=False)
        candidate_summary.write_bytes(original_summary)
        probe_log=roots[1]/'output/metrics/stage-events.jsonl'
        original_log=probe_log.read_bytes()
        for malformed in [{},{'schema':2,'runId':'candidate-run','stage':'qa','eventType':'started'}]:
            probe_log.write_bytes(original_log+(json.dumps(malformed)+'\n').encode())
            self.run_cmd(['node',str(VIDEO/'review-summary.mjs'),'--run-id=candidate-run','--status=partial','--synthetic','--json'],cwd=roots[1])
            self.assertIn('inconclusive',self.run_cmd(probe_args,ok=False).stderr)
        probe_log.write_bytes(original_log)
        candidate_summary.write_bytes(original_summary)
        (roots[1]/'evaluator.py').write_text(evaluator+'# deleted-marker-equivalent change\n')
        self.call('compare',*args,ok=False)
        self.assertEqual(len(self.call('review')['candidates'][0]['comparisons']),1)
        (roots[1]/'evaluator.py').write_text(evaluator)
        summary_path=roots[1]/summaries[1];data=json.loads(summary_path.read_text())
        data['measurements']['stages']=[s for s in data['measurements']['stages'] if s['stage']!='qa']
        summary_path.write_text(json.dumps(data))
        self.call('compare',*args,ok=False)
        log=roots[1]/'output/metrics/stage-events.jsonl'
        original=log.read_text();events=[json.loads(line) for line in original.splitlines()]
        for incomplete in [events[:1],[]]:
            log.write_text(''.join(json.dumps(e)+'\n' for e in incomplete))
            self.run_cmd(['node',str(VIDEO/'review-summary.mjs'),'--run-id=candidate-run','--status=partial','--synthetic','--json'],cwd=roots[1])
            error=self.call('compare',*args,ok=False)
            self.assertIn('inconclusive',error)
        self.assertEqual(len(self.call('review')['candidates'][0]['comparisons']),1)

    def test_task_probe_does_not_hide_stage_regression_in_lower_total(self):
        roots=[];summaries=[]
        for name,qa_exit,type_exit in [('baseline',1,0),('candidate',0,1)]:
            root=self.base/name;root.mkdir();roots.append(root)
            for filename in ['cases.json','evaluator.py','context.json','result.json']:
                (root/filename).write_text('{}')
            for stage,label,code in [('qa','check-a',qa_exit),('qa','check-b',qa_exit),('typecheck','check-c',type_exit)]:
                self.run_cmd(['node',str(VIDEO/'measure-stage.mjs'),'--stage='+stage,'--label='+label,'--run-id='+name,
                              '--',sys.executable,'-c','raise SystemExit('+str(code)+')'],ok=code==0,cwd=root)
            summary=self.run_cmd(['node',str(VIDEO/'review-summary.mjs'),'--run-id='+name,'--status=partial','--synthetic','--json'],cwd=root)
            summaries.append(json.loads(summary.stdout)['paths'][0])
        args=[sys.executable,str(FIX/'scripts/task_probe.py'),'--allow-synthetic','--case-set','cases.json',
              '--evaluator','evaluator.py','--execution-context','context.json']
        for label,root,summary in zip(['baseline','candidate'],roots,summaries):
            args += ['--'+label+'-root',str(root),'--'+label+'-summary',summary,'--'+label+'-artifact','result.json']
        result=json.loads(self.run_cmd(args).stdout)['comparison']
        self.assertEqual(result['baseline']['failedAttempts'],2)
        self.assertEqual(result['candidate']['failedAttempts'],1)
        self.assertEqual(result['finding'],'recorded-stage-regression')
        self.assertEqual(result['regressedStages'],['typecheck'])

    def test_disabled_memory_still_allows_forgetting_lessons(self):
        item=self.ingest()['created'][0];self.approve(item['id'])
        self.run_cmd([sys.executable,str(MEM),'--root',str(self.root),'disable','--confirmed'])
        self.call('retrieve',ok=False)
        self.call('forget','--check-id',item['checkId'],'--confirmed')
        self.assertEqual(self.call('review')['candidates'],[])

if __name__=='__main__':unittest.main()

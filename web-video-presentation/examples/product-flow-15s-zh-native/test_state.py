import unittest
from state import *

class TimelineTests(unittest.TestCase):
    def test_exact_duration(self):self.assertEqual(FRAMES/FPS,15)
    def test_input_finished_before_request(self):
        self.assertEqual(state(140)['input'],TASK);self.assertFalse(state(140)['build_requested']);self.assertTrue(state(141)['build_requested'])
    def test_three_rows_only(self):self.assertEqual(len(STEPS),3)
    def test_task_identity_preserved(self):self.assertEqual({state(f)['task_id'] for f in range(FRAMES)},{'任务 041'})
    def test_rows_complete_before_check(self):
        for f in range(FRAMES):
            s=state(f)
            for i,done in enumerate(s['done']):
                if done:self.assertEqual(s['row_progress'][i],1)
    def test_completion_exact_boundaries(self):
        for i,c in enumerate(COMPLETE_TIMES):
            f=round(c*FPS);self.assertFalse(state(f-1)['done'][i]);self.assertTrue(state(f)['done'][i])
    def test_count_follows_actual_toggles(self):
        for f in range(FRAMES):self.assertEqual(state(f)['done_count'],sum(state(f)['done']))
    def test_no_early_ready(self):
        self.assertFalse(state(377)['all_done']);self.assertTrue(state(378)['all_done'])
    def test_no_completion_in_plan_segment(self):self.assertTrue(all(state(f)['done_count']==0 for f in range(300)))
    def test_completion_pointer_on_toggle(self):
        for i,c in enumerate(COMPLETE_TIMES):self.assertEqual(cursor(c),(974,449+130*i))
    def test_pointer_build_hit(self):
        x,y=cursor(4.7);self.assertTrue(1120<=x<=1515 and 660<=y<=744)
    def test_invalid_frames(self):
        for f in [-1,450,False,1.5]:
            with self.assertRaises(ValueError):state(f)
    def test_phase_lengths(self):
        for name in ['INPUT','PLAN','COMPLETE']:self.assertEqual(sum(state(f)['phase']==name for f in range(FRAMES)),150)
    def test_final_reading_hold(self):self.assertTrue(all(state(f)['all_done'] for f in range(390,450)))

if __name__=='__main__':unittest.main()

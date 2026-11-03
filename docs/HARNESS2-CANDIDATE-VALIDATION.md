# Harness²-inspired candidate delta (2026-11-03)

Unpublished candidate only. Base input archive SHA256:
`b47f9d5820a63cff66570792806005edfd29c48cbfaa1bf62e0ac8a07175db0d`.
No release/version bump, installation, remote push, or user-memory mutation is implied.

## Verified primary sources

- https://github.com/google-research/harness2 : official README, harness components, recursion modes and default executor security caveat.
- https://arxiv.org/html/2610.14224v1 : sections 2.2–2.3, especially matched task executions, selective composition, execution of the composed successor, and evidence-supported library updates.
- https://github.com/google-research/harness2/blob/main/docs/EXPERIMENTS.md : experiment and baseline context.

Adapted concepts, not upstream code or dependency integration. Fixed model weights; no claimed benchmark reproduction or video quality gain. Existing permission and sandbox boundaries override research runtime defaults.

## Changes

- Added read-only `fix-agent/scripts/task_probe.py`, using the existing comparison verifier without a memory root or prior lesson. It compares current-task snapshots before task completion, binds matched execution-context bytes, and outputs reviewable JSON. It does not propose/edit/run/compose automatically.
- Shared comparison now exposes per-stage failure counts and regressed stages. A stage regression wins over a decreasing total in the finding. This is a conservative technical signal, not per-check correctness or an aesthetic score.
- Comparison rejects empty execution context and summaries reporting invalid/conflicting log records; malformed basic event records no longer silently disappear from the Python verifier. This conservative check does not replace review of trusted execution evidence.
- Comparison rejects invalid synthetic flags and mixed synthetic/production snapshots, even with the test-only flag.
- Added current-task Propose–Probe–Compose instructions and routing; require rechecking a composed candidate, conservative baseline retention, bounded authorized experiments and independent checks. Task-end approved/versioned memory remains a distinct cross-task path.
- Existing approval, revoke/forget, synthetic isolation, log/hash/coverage, independent evaluator/case-set, path and consent gates remain.

## Validation actually run on this candidate

`python3 -m unittest discover -s harness2_candidate/fix-agent/tests -v`

27 tests passed in 12.782 seconds after review fixes. The suite includes actual local Node/Python measured subprocess fixtures, unchanged memory lifecycle tests, task-local probe success/no memory mutation, context mismatch and empty/whitespace/empty-argument rejection, actual malformed-log → regenerated-summary → inconclusive-probe rejection, mixed/invalid synthetic rejection, and a regression fixture with total failures 2→1 but typecheck failures 0→1 correctly flagged. These are synthetic test fixtures, not user memory or video renders.

## Not run / limitations

No user Mac access, Chromium, Remotion execution, npm build/install, registry operations, model calls, production TTS, video generation or visual/audio acceptance. No denied operation was retried. No remote push. Full repository/template suites were not rerun by this delta task. Prior base-archive validation remains separate evidence.

Context matching binds bytes only: caller must review matching task/input/model/tool/environment/seed records and verify actual execution. Hashes do not authenticate those statements. Stage totals can hide regressions within the same stage; inspect checks and media. No automatic multi-candidate search, automatic merge, model-weight training or evidence-backed real-video improvement claim. Production validation and publication remain separate decisions.

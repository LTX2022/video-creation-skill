#!/usr/bin/env python3
"""Read-only same-task contrast. Runs no evaluator; writes no memory or approval."""
import argparse
import json
import sys
from lesson_cycle import comparison


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for label in ['baseline', 'candidate']:
        for field in ['root', 'summary', 'artifact']:
            parser.add_argument('--' + label + '-' + field, required=True)
    parser.add_argument('--case-set', required=True)
    parser.add_argument('--evaluator', required=True)
    parser.add_argument('--execution-context', required=True,
                        help='Same relative context file in both authorized snapshots; bytes must match')
    parser.add_argument('--allow-synthetic', action='store_true')
    args = parser.parse_args()
    result = comparison(args)
    return {'schema': 1, 'kind': 'task-local-behavioral-contrast',
            'comparison': result, 'memoryWritten': False,
            'adoption': 'requires-review', 'grantsExecutionPermission': False,
            'limits': ['Matched context bytes do not authenticate execution or source truth',
                       'No model training, automatic composition, acceptance, or correctness proof']}


if __name__ == '__main__':
    try:
        print(json.dumps(main(), ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError, TypeError, AttributeError) as error:
        print('task-probe: ' + str(error), file=sys.stderr)
        sys.exit(1)

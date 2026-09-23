import { formatMessage } from '5board.vsc-common';
import { t } from '../localization';
import {
  MIN_PYTHON_VERSION,
  formatPythonVersion,
  type CheckedCandidate,
  type PythonFailure,
} from './pythonToolchain';

export function describePythonFailure(failure: PythonFailure): string {
  const required = formatPythonVersion(MIN_PYTHON_VERSION);
  const lead =
    failure.kind === 'config-unusable'
      ? formatMessage(t('extension.codeblock.python.configUnusable'), { path: failure.path })
      : formatMessage(t('extension.codeblock.python.notFound'), {
          required,
          tried: [...new Set(failure.checked.map((candidate) => candidate.command))].join(', '),
        });

  return [lead, olderVersions(failure.checked), storeStubHint(failure.checked)]
    .filter(Boolean)
    .join(' ');
}

function olderVersions(checked: CheckedCandidate[]): string | undefined {
  const found = [
    ...new Set(
      checked
        .filter((candidate) => candidate.outcome === 'too-old')
        .map((candidate) => formatPythonVersion(candidate.version!)),
    ),
  ];
  if (found.length === 0) return undefined;
  return formatMessage(t('extension.codeblock.python.foundOlder'), { found: found.join(', ') });
}

function storeStubHint(checked: CheckedCandidate[]): string | undefined {
  return checked.some((candidate) => candidate.outcome === 'no-version')
    ? t('extension.codeblock.python.storeStubHint')
    : undefined;
}

import { formatMessage, type TranslationKey } from '5board.vsc-common';
import { t } from '../localization';
import {
  MIN_PYTHON_VERSION,
  formatPythonVersion,
  type CandidateOutcome,
  type CheckedCandidate,
  type PythonFailure,
  type PythonSource,
  type PythonToolchainResult,
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

const STAGE_LABEL_KEY: Record<PythonSource, TranslationKey> = {
  config: 'extension.codeblock.toolchain.stage.config',
  path: 'extension.codeblock.toolchain.stage.path',
};

const OUTCOME_LABEL_KEY: Record<CandidateOutcome, TranslationKey> = {
  'not-found': 'extension.codeblock.toolchain.outcome.notFound',
  'no-version': 'extension.codeblock.python.outcomeNoVersion',
  'too-old': 'extension.codeblock.toolchain.outcome.tooOld',
  ok: 'extension.codeblock.toolchain.outcome.ok',
};

/** Everything the lookup saw, in the same layout as the Java report. */
export function formatPythonToolchainReport(
  result: PythonToolchainResult,
  configuredHome: string | undefined,
): string {
  const row = (label: TranslationKey, value: string) => `  ${`${t(label)}:`.padEnd(22)} ${value}`;
  const lines = [t('extension.codeblock.python.reportTitle'), ''];

  lines.push(
    row(
      'extension.codeblock.toolchain.report.configuredHome',
      configuredHome?.trim() || t('extension.codeblock.toolchain.report.notSet'),
    ),
  );
  lines.push(
    row(
      'extension.codeblock.toolchain.report.minimumRequired',
      `Python ${formatPythonVersion(MIN_PYTHON_VERSION)}`,
    ),
  );
  lines.push('');

  if (result.ok) {
    const { toolchain } = result;
    lines.push(row('extension.codeblock.toolchain.report.selected', toolchain.pythonPath));
    lines.push(
      row('extension.codeblock.toolchain.report.viaStage', t(STAGE_LABEL_KEY[toolchain.source])),
    );
    lines.push(
      row(
        'extension.codeblock.toolchain.report.version',
        `Python ${formatPythonVersion(toolchain.version)}`,
      ),
    );
  } else {
    lines.push(
      row(
        'extension.codeblock.toolchain.report.selected',
        t('extension.codeblock.toolchain.report.none'),
      ),
    );
    lines.push(
      row('extension.codeblock.toolchain.report.problem', describePythonFailure(result.failure)),
    );
  }

  lines.push('', t('extension.codeblock.toolchain.report.checked'));
  for (const candidate of result.checked) {
    const version = candidate.version ? ` — Python ${formatPythonVersion(candidate.version)}` : '';
    const mark =
      candidate.outcome === 'ok'
        ? ` ${t('extension.codeblock.toolchain.report.selectedMark')}`
        : '';
    lines.push(
      `  ${t(STAGE_LABEL_KEY[candidate.source]).padEnd(26)} ${t(OUTCOME_LABEL_KEY[candidate.outcome])}: ` +
        `${candidate.command}${version}${mark}`,
    );
  }

  return lines.join('\n');
}

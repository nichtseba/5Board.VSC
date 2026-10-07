import { formatMessage, type TranslationKey } from '5board.vsc-common';
import { t } from '../localization';
import {
  MIN_JAVA_MAJOR,
  type StageOutcome,
  type ToolchainFailure,
  type ToolchainResult,
  type ToolchainSource,
} from './javaToolchain';

const STAGE_LABEL_KEY: Record<ToolchainSource, TranslationKey> = {
  config: 'extension.codeblock.toolchain.stage.config',
  'java-home': 'extension.codeblock.toolchain.stage.javaHome',
  'well-known': 'extension.codeblock.toolchain.stage.wellKnown',
  path: 'extension.codeblock.toolchain.stage.path',
};

function stageLabel(source: ToolchainSource): string {
  return t(STAGE_LABEL_KEY[source]);
}

export function describeToolchainFailure(failure: ToolchainFailure): string {
  switch (failure.kind) {
    case 'config-not-found':
      return formatMessage(t('extension.codeblock.toolchain.configNotFound'), {
        path: failure.path,
      });

    case 'incomplete-jdk': {
      const missing = failure.missing
        .map((tool) => `bin/${tool}`)
        .join(` ${t('extension.codeblock.toolchain.and')} `);
      const sentence = formatMessage(
        t(
          failure.missing.length > 1
            ? 'extension.codeblock.toolchain.missingMany'
            : 'extension.codeblock.toolchain.missingOne',
        ),
        { missing, path: failure.path },
      );
      // Only a lone missing compiler points at a JRE; if both are gone it is not a JDK at all.
      const hint =
        failure.missing.length === 1 && failure.missing[0] === 'javac'
          ? t('extension.codeblock.toolchain.jreHint')
          : t('extension.codeblock.toolchain.notJdkHint');
      return `${sentence} ${hint}`;
    }

    case 'too-old':
      return formatMessage(t('extension.codeblock.toolchain.tooOld'), {
        found: failure.found,
        required: failure.required,
      });

    case 'version-mismatch':
      return formatMessage(t('extension.codeblock.toolchain.versionMismatch'), {
        java: failure.java,
        javac: failure.javac,
      });

    case 'not-found': {
      // Deduplicated: the well-known stage adds one entry per candidate.
      const searched = [
        ...new Set(
          failure.checked
            .filter((stage) => stage.outcome !== 'not-set')
            .map((stage) => stageLabel(stage.source)),
        ),
      ];
      const found = [
        ...new Set(
          failure.checked
            .filter((stage) => stage.majorVersion !== undefined)
            .map((stage) => `Java ${stage.majorVersion} (${stageLabel(stage.source)})`),
        ),
      ];

      return [
        formatMessage(t('extension.codeblock.toolchain.notFound'), {
          required: MIN_JAVA_MAJOR,
          searched: searched.join(', ') || stageLabel('path'),
        }),
        found.length > 0
          ? formatMessage(t('extension.codeblock.toolchain.notFoundFound'), {
              found: found.join(', '),
            })
          : undefined,
        formatMessage(t('extension.codeblock.toolchain.notFoundHint'), {
          required: MIN_JAVA_MAJOR,
        }),
      ]
        .filter(Boolean)
        .join(' ');
    }
  }
}

type KeySuffix<Prefix extends string, Key = TranslationKey> = Key extends `${Prefix}${infer Rest}`
  ? Rest
  : never;
type ReportKey = KeySuffix<'extension.codeblock.toolchain.report.'>;

const OUTCOME_LABEL_KEY: Record<StageOutcome, TranslationKey> = {
  'not-set': 'extension.codeblock.toolchain.outcome.notSet',
  'not-found': 'extension.codeblock.toolchain.outcome.notFound',
  incomplete: 'extension.codeblock.toolchain.outcome.incomplete',
  'too-old': 'extension.codeblock.toolchain.outcome.tooOld',
  'version-mismatch': 'extension.codeblock.toolchain.outcome.versionMismatch',
  ok: 'extension.codeblock.toolchain.outcome.ok',
  'not-reached': 'extension.codeblock.toolchain.outcome.notReached',
};

/** Everything the chain saw, for the "Show Java Toolchain" command. */
export function formatToolchainReport(
  result: ToolchainResult,
  configuredHome: string | undefined,
): string {
  const report = (key: ReportKey) => t(`extension.codeblock.toolchain.report.${key}`);
  const row = (key: ReportKey, value: string) => `  ${`${report(key)}:`.padEnd(22)} ${value}`;
  const lines = [report('title'), ''];

  lines.push(row('configuredHome', configuredHome?.trim() || report('notSet')));
  lines.push(
    row(
      'minimumRequired',
      formatMessage(report('minimumRequiredValue'), { required: MIN_JAVA_MAJOR }),
    ),
  );
  lines.push('');

  if (result.ok) {
    const { toolchain } = result;
    lines.push(row('selected', toolchain.home ?? report('fromPath')));
    lines.push(row('viaStage', stageLabel(toolchain.source)));
    lines.push(row('version', `Java ${toolchain.majorVersion}`));
    lines.push(`  ${'java'.padEnd(22)} ${toolchain.javaPath}`);
    lines.push(`  ${'javac'.padEnd(22)} ${toolchain.javacPath}`);
  } else {
    lines.push(row('selected', report('none')));
    lines.push(row('problem', describeToolchainFailure(result.failure)));
  }

  lines.push('', report('checked'));
  for (const stage of result.checked) {
    const details = [
      stage.path,
      stage.majorVersion !== undefined ? `Java ${stage.majorVersion}` : undefined,
      stage.missing?.length
        ? formatMessage(report('missing'), { tools: stage.missing.join(', ') })
        : undefined,
    ]
      .filter(Boolean)
      .join(' — ');
    const mark = stage.outcome === 'ok' ? ` ${report('selectedMark')}` : '';
    lines.push(
      `  ${stageLabel(stage.source).padEnd(26)} ${t(OUTCOME_LABEL_KEY[stage.outcome])}` +
        (details ? `: ${details}` : '') +
        mark,
    );
  }

  return lines.join('\n');
}

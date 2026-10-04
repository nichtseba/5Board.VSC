import { SUPPORTED_LANGUAGES, classLanguages } from '5board.vsc-common';
import type { LanguageSupport } from '5board.vsc-common';
import type { DropdownOption } from 'vscrui';

export function languageOptions(): DropdownOption[] {
  return toOptions(SUPPORTED_LANGUAGES);
}

/** Only languages that have named classes can hold user-created classes. */
export function classLanguageOptions(): DropdownOption[] {
  return toOptions(classLanguages());
}

function toOptions(languages: readonly LanguageSupport[]): DropdownOption[] {
  return languages.map((support) => ({ value: support.id, label: support.displayName }));
}

/** vscrui's Dropdown reports either the raw value or the option object. */
export function optionValue(value: string | DropdownOption | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.value;
}

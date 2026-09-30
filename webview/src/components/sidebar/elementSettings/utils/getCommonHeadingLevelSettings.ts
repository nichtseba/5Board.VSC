import { HeadingLevelSettings } from '5board.vsc-common';
import { getCommonValue } from './getCommonValue';

export function getCommonHeadingLevelSettings(
  settings: HeadingLevelSettings[],
): HeadingLevelSettings {
  return {
    fontFamily: getCommonValue(settings.map((setting) => setting.fontFamily)),

    fontSize: getCommonValue(settings.map((setting) => setting.fontSize)),

    fontWeight: getCommonValue(settings.map((setting) => setting.fontWeight)),

    fontStyle: getCommonValue(settings.map((setting) => setting.fontStyle)),

    color: getCommonValue(settings.map((setting) => setting.color)),

    backgroundColor: getCommonValue(settings.map((setting) => setting.backgroundColor)),

    textDecoration: {
      underline: getCommonValue(settings.map((setting) => setting.textDecoration?.underline)),
    },
  };
}

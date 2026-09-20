import {
  EditorElement,
  EditorElementType,
  // HeadingLevelSettings,
  // HeadingNumberingFormat,
  // HeadingNumberingStyle,
  // PROJECTOR_POINTER_PRESET_COLORS,
  // getHeadingLevelSettings,
  // getHeadingNumberingEnabled,
  // getHeadingNumberingStyle,
} from '5board.vsc-common';
// import { Button, Dropdown, DropdownOption, TextField } from 'vscrui';
// import SettingsField from '../layout/SettingsField';
// import SettingsPanel from '../layout/SettingsPanel';
// import { useLocalization } from '../../../providers/LocalizationProvider';
// import { useMessageService } from '../../../services/MessageService';
// import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
// import { ColorPresets } from '../components/ColorPresets';
// import { ColorPicker } from '../components/ColorPicker';
// import { FontSizeInput } from './components/FontSizeInput';

type Props = {
  elements: EditorElement<EditorElementType.Heading>[];
};
export function HeadingSettings({ elements }: Props) {
  const selectedElementIds = elements.map((element) => element.id);
  return <div>Add HeadingSettings for {selectedElementIds.join(', ')}</div>;

  // const { t } = useLocalization();
  // const messages = useMessageService();
  // const document = useBoardDocument();
  // const levelSettings = getHeadingLevelSettings(
  //   document?.content.headingSettings,
  //   element.data.level,
  // );
  // const numberingEnabled = getHeadingNumberingEnabled(document?.content.headingSettings);
  // const numberingFormat = getHeadingNumberingStyle(
  //   document?.content.headingSettings,
  //   element.data.level,
  // );

  // const handleLevelChange = (value: string | DropdownOption | undefined) => {
  //   if (!value) {
  //     return;
  //   }
  //   const newLevel = typeof value === 'string' ? value : value.value;
  //   const level = parseInt(newLevel, 10) as 1 | 2 | 3 | 4 | 5 | 6;

  //   messages.send({
  //     type: 'updateElement',
  //     id: element.id,
  //     changes: {
  //       data: {
  //         ...element.data,
  //         level,
  //       },
  //     },
  //   });
  // };

  // const handleNumberingChange = (value: string | DropdownOption | undefined) => {
  //   if (!value) {
  //     return;
  //   }

  //   const nextFormat = (typeof value === 'string' ? value : value.value) as HeadingNumberingFormat;

  //   if (nextFormat === 'none') {
  //     messages.send({
  //       type: 'updateHeadingNumbering',
  //       enabled: false,
  //     });
  //     return;
  //   }

  //   messages.send({
  //     type: 'updateHeadingNumbering',
  //     enabled: true,
  //     level: element.data.level,
  //     numberingFormat: nextFormat as HeadingNumberingStyle,
  //   });
  // };

  // const handleLevelSettingsChange = (changes: HeadingLevelSettings) => {
  //   messages.send({
  //     type: 'updateHeadingLevelSettings',
  //     level: element.data.level,
  //     changes,
  //   });
  // };

  // const handleFontSizeChange = (value: string) => {
  //   const fontSize = Number(value);

  //   if (Number.isFinite(fontSize) && fontSize > 0) {
  //     handleLevelSettingsChange({ fontSize });
  //   }
  // };

  // return (
  //   <>
  //     <SettingsPanel
  //       title={t('webview.sidebar-element-settings.headingSettings.title')}
  //       icon="text-size"
  //     >
  //       <SettingsField
  //         label={t('webview.sidebar-element-settings.headingSettings.levelLabel')}
  //         inline
  //       >
  //         <Dropdown
  //           className="w-24"
  //           options={[
  //             { value: '1', label: 'H1' },
  //             { value: '2', label: 'H2' },
  //             { value: '3', label: 'H3' },
  //             { value: '4', label: 'H4' },
  //             { value: '5', label: 'H5' },
  //             { value: '6', label: 'H6' },
  //           ]}
  //           value={String(element.data.level)}
  //           onChange={handleLevelChange}
  //         />
  //       </SettingsField>
  //       <SettingsField
  //         label={`${t('webview.sidebar-element-settings.headingSettings.numberingLabel')} H${
  //           element.data.level
  //         }`}
  //       >
  //         <Dropdown
  //           options={[
  //             {
  //               value: 'none',
  //               label: t('webview.sidebar-element-settings.headingSettings.numberingNone'),
  //             },
  //             {
  //               value: 'decimal',
  //               label: '1, 2, 3',
  //             },
  //             {
  //               value: 'lower-alpha',
  //               label: 'a, b, c',
  //             },
  //             {
  //               value: 'upper-alpha',
  //               label: 'A, B, C',
  //             },
  //             {
  //               value: 'lower-roman',
  //               label: 'i, ii, iii',
  //             },
  //             {
  //               value: 'upper-roman',
  //               label: 'I, II, III',
  //             },
  //           ]}
  //           value={numberingEnabled ? numberingFormat : 'none'}
  //           onChange={handleNumberingChange}
  //         />
  //       </SettingsField>
  //       <SettingsField label={t('webview.sidebar-element-settings.headingSettings.fontFamily')}>
  //         <TextField
  //           value={levelSettings.fontFamily ?? ''}
  //           placeholder={t(
  //             'webview.sidebar-element-settings.headingSettings.fontFamilyPlaceholder',
  //           )}
  //           onChange={(fontFamily) => handleLevelSettingsChange({ fontFamily })}
  //         />
  //       </SettingsField>
  //       <SettingsField
  //         label={t('webview.sidebar-element-settings.headingSettings.fontSize')}
  //         inline
  //       >
  //         <FontSizeInput value={levelSettings.fontSize ?? ''} onChange={handleFontSizeChange} />
  //       </SettingsField>
  //       <SettingsField
  //         label={t('webview.sidebar-element-settings.headingSettings.textStyle')}
  //         inline
  //       >
  //         <div className="flex gap-2">
  //           <Button
  //             appearance={levelSettings.fontWeight === 'bold' ? 'primary' : 'secondary'}
  //             title={t('webview.sidebar-element-settings.headingSettings.bold')}
  //             onClick={() =>
  //               handleLevelSettingsChange({
  //                 fontWeight: levelSettings.fontWeight === 'bold' ? 'normal' : 'bold',
  //               })
  //             }
  //           >
  //             <span className="codicon codicon-bold" />
  //           </Button>
  //           <Button
  //             appearance={levelSettings.fontStyle === 'italic' ? 'primary' : 'secondary'}
  //             title={t('webview.sidebar-element-settings.headingSettings.italic')}
  //             onClick={() =>
  //               handleLevelSettingsChange({
  //                 fontStyle: levelSettings.fontStyle === 'italic' ? 'normal' : 'italic',
  //               })
  //             }
  //           >
  //             <span className="codicon codicon-italic" />
  //           </Button>
  //           <Button
  //             appearance={levelSettings.textDecoration?.underline ? 'primary' : 'secondary'}
  //             title={t('webview.sidebar-element-settings.headingSettings.underline')}
  //             onClick={() =>
  //               handleLevelSettingsChange({
  //                 textDecoration: {
  //                   underline: !levelSettings.textDecoration?.underline,
  //                 },
  //               })
  //             }
  //           >
  //             <span className="font-semibold underline">U</span>
  //           </Button>
  //         </div>
  //       </SettingsField>
  //       <SettingsField label={t('webview.sidebar-element-settings.headingSettings.color')}>
  //         <ColorField
  //           value={levelSettings.color ?? ''}
  //           onChange={(color) => handleLevelSettingsChange({ color })}
  //         />
  //       </SettingsField>
  //       <SettingsField
  //         label={t('webview.sidebar-element-settings.headingSettings.backgroundColor')}
  //       >
  //         <ColorField
  //           value={levelSettings.backgroundColor ?? ''}
  //           onChange={(backgroundColor) => handleLevelSettingsChange({ backgroundColor })}
  //         />
  //       </SettingsField>
  //     </SettingsPanel>
  //   </>
  // );
}

// function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
//   return (
//     <div className="flex flex-col gap-2">
//       <ColorPresets
//         color={value}
//         onChange={onChange}
//         presets={PROJECTOR_POINTER_PRESET_COLORS.map((preset) => ({
//           value: preset.value,
//           theme: true,
//         }))}
//       />
//       <div className="flex items-center gap-2">
//         <ColorPicker color={value} onChange={onChange} />
//         <TextField className="flex-1" value={value} placeholder="#000000" onChange={onChange} />
//       </div>
//     </div>
//   );
// }

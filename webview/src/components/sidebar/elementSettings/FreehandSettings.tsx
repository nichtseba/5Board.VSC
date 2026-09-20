import {
  //DEFAULT_FREEHAND_PARAMETERS,
  EditorElement,
  EditorElementType,
  // FREEHAND_COLORS,
  // FREEHAND_LINE_STYLES,
  // FREEHAND_MAX_DASH,
  // FREEHAND_MAX_WIDTH,
  // FREEHAND_MIN_DASH,
  // FREEHAND_MIN_WIDTH,
  // LineStyle,
  // TranslationKey,
} from '5board.vsc-common';
// import SettingsPanel from '../layout/SettingsPanel';
// import ColorSelector from '../components/ColorSelector';
// import SliderInput from '../components/SliderInput';
// import LineStyleSelect from '../components/LineStyleSelect';
// import { useLocalization } from '../../../providers/LocalizationProvider';
// import { useMessageService } from '../../../services/MessageService';

type Props = {
  elements: EditorElement<EditorElementType.Freehand>[];
};

// Settings for a drawn freehand element. Color/width live per stroke,
// opacity on the element style. Each change pushes an 'updateElement'.
export function FreehandSettings({ elements }: Props) {
  const selectedElementIds = elements.map((element) => element.id);
  return <div>Add FreehandSettings for {selectedElementIds.join(', ')}</div>;

  // const { t } = useLocalization();
  // const messages = useMessageService();

  // const firstStroke = element.data.strokes[0];
  // const color = firstStroke?.color ?? DEFAULT_FREEHAND_PARAMETERS.color;
  // const width = firstStroke?.width ?? DEFAULT_FREEHAND_PARAMETERS.width;
  // const lineStyle = firstStroke?.lineStyle ?? DEFAULT_FREEHAND_PARAMETERS.lineStyle;
  // const dashScale = firstStroke?.dashScale ?? DEFAULT_FREEHAND_PARAMETERS.dashScale;
  // const opacity = element.style.opacity ?? DEFAULT_FREEHAND_PARAMETERS.opacity;

  // // Apply a stroke patch to all strokes and push the update.
  // const patchStrokes = (patch: {
  //   color?: string;
  //   width?: number;
  //   lineStyle?: LineStyle;
  //   dashScale?: number;
  // }) => {
  //   messages.send({
  //     type: 'updateElement',
  //     id: element.id,
  //     changes: { data: { strokes: element.data.strokes.map((s) => ({ ...s, ...patch })) } },
  //   });
  // };

  // const handleOpacity = (value: number) => {
  //   messages.send({
  //     type: 'updateElement',
  //     id: element.id,
  //     changes: { style: { ...element.style, opacity: value } },
  //   });
  // };

  // return (
  //   <SettingsPanel
  //     title={t('webview.sidebar-element-settings.freehandSettings.title')}
  //     icon="pencil"
  //   >
  //     <div className="flex flex-col gap-4">
  //       <ColorSelector
  //         color={color}
  //         onChange={(c) => patchStrokes({ color: c })}
  //         presets={FREEHAND_COLORS.map((c) => ({
  //           value: c.value,
  //           label: t(`webview.sidebar.freehand.colors.${c.id}` as TranslationKey),
  //         }))}
  //         label={t('webview.sidebar.freehand.color')}
  //         customColorLabel={t('webview.sidebar.freehand.customColor')}
  //       />

  //       <SliderInput
  //         label={t('webview.sidebar.freehand.width')}
  //         value={width}
  //         min={FREEHAND_MIN_WIDTH}
  //         max={FREEHAND_MAX_WIDTH}
  //         step={1}
  //         unit="px"
  //         onChange={(w) => patchStrokes({ width: w })}
  //       />

  //       <LineStyleSelect
  //         label={t('webview.sidebar.freehand.lineStyle')}
  //         value={lineStyle}
  //         options={FREEHAND_LINE_STYLES.map((s) => ({
  //           id: s.id,
  //           label: t(`webview.sidebar.freehand.lineStyles.${s.id}` as TranslationKey),
  //         }))}
  //         onChange={(value) => patchStrokes({ lineStyle: value })}
  //       />

  //       {/* Dash size slider — only for the custom line style. */}
  //       {lineStyle === 'custom' && (
  //         <SliderInput
  //           label={t('webview.sidebar.freehand.dashScale')}
  //           value={dashScale}
  //           min={FREEHAND_MIN_DASH}
  //           max={FREEHAND_MAX_DASH}
  //           step={0.1}
  //           onChange={(value) => patchStrokes({ dashScale: value })}
  //         />
  //       )}

  //       {/* Opacity slider in percent (0–100%). Stored as opacity (0..1). */}
  //       <SliderInput
  //         label={t('webview.sidebar.freehand.opacity')}
  //         value={Math.round(opacity * 100)}
  //         min={0}
  //         max={100}
  //         step={1}
  //         unit="%"
  //         onChange={(value) => handleOpacity(value / 100)}
  //       />
  //     </div>
  //   </SettingsPanel>
  // );
}

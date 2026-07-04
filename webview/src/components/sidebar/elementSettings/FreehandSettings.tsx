import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  element: EditorElement<EditorElementType.Freehand>;
};

export function FreehandSettings({ element }: Props) {
  const { t } = useLocalization();
  return <div>{t('webview.sidebar.freehand.addSettings') + (element.type as string + ' ' + element.id)}</div>;
}

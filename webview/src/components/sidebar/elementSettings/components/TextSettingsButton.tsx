import {
  EditorElement,
  EditorElementType,
  TextEditorCommand,
  TranslationKey,
} from '5board.vsc-common';
import { Button } from 'vscrui';
import { useMessageService } from '../../../../services/MessageService';
import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
  BoldIcon,
  CodeBracketIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from '@heroicons/react/24/outline';
import type { SVGProps } from 'react';
import { getCommonValue } from '../utils/getCommonValue';
import { useLocalization } from '../../../../providers/LocalizationProvider';

type IconType = React.ComponentType<{ className?: string }>;

type TextSettingsButtonProps = {
  active: boolean | undefined;
  command: TextEditorCommand;
  elements: EditorElement<EditorElementType.Text>[];
  Icon: IconType;
  title: TranslationKey;
};

export function TextSettingsButton({
  active,
  command,
  elements,
  Icon,
  title,
}: TextSettingsButtonProps) {
  const messages = useMessageService();
  const { t } = useLocalization();
  return (
    <Button
      className="h-8 flex flex-col items-center justify-center gap-2"
      appearance={active ? 'primary' : 'secondary'}
      title={t(title)}
      onClick={() =>
        messages.send({
          type: 'textEditorCommand',
          ids: elements.map((element) => element.id),
          command,
        })
      }
    >
      <Icon className="size-5" />
    </Button>
  );
}

type Props = {
  elements: EditorElement<EditorElementType.Text>[];
};

export function BoldButton({ elements }: Props) {
  const bold = getCommonValue(elements.map((element) => element.data.tiptap?.marks?.bold));
  return (
    <TextSettingsButton
      active={bold}
      command={{ type: 'toggleBold' }}
      elements={elements}
      Icon={BoldIcon}
      title="webview.sidebar-element-settings.textSettings.boldTooltip"
    />
  );
}

export function ItalicButton({ elements }: Props) {
  const italic = getCommonValue(elements.map((element) => element.data.tiptap?.marks?.italic));
  return (
    <TextSettingsButton
      active={italic}
      command={{ type: 'toggleItalic' }}
      elements={elements}
      Icon={ItalicIcon}
      title="webview.sidebar-element-settings.textSettings.italicTooltip"
    />
  );
}

export function StrikeButton({ elements }: Props) {
  const strike = getCommonValue(elements.map((element) => element.data.tiptap?.marks?.strike));
  return (
    <TextSettingsButton
      active={strike}
      command={{ type: 'toggleStrike' }}
      elements={elements}
      Icon={StrikethroughIcon}
      title="webview.sidebar-element-settings.textSettings.strikeTooltip"
    />
  );
}

export function UnderlineButton({ elements }: Props) {
  const underline = getCommonValue(
    elements.map((element) => element.data.tiptap?.marks?.underline),
  );
  return (
    <TextSettingsButton
      active={underline}
      command={{ type: 'toggleUnderline' }}
      elements={elements}
      Icon={UnderlineIcon}
      title="webview.sidebar-element-settings.textSettings.underlineTooltip"
    />
  );
}

export function CodeButton({ elements }: Props) {
  const code = getCommonValue(elements.map((element) => element.data.tiptap?.marks?.code));
  return (
    <TextSettingsButton
      active={code}
      command={{ type: 'toggleCode' }}
      elements={elements}
      Icon={CodeBracketIcon}
      title="webview.sidebar-element-settings.textSettings.codeTooltip"
    />
  );
}

export function AlignLeftButton({ elements }: Props) {
  const alignLeft = getCommonValue(
    elements.map((element) => element.data.tiptap?.nodes?.attributes?.textAlign === 'left'),
  );
  return (
    <TextSettingsButton
      active={alignLeft}
      command={{ type: 'setTextAlign', value: 'left' }}
      elements={elements}
      Icon={Bars3BottomLeftIcon}
      title="webview.sidebar-element-settings.textSettings.alignLeftTooltip"
    />
  );
}

export function AlignCenterButton({ elements }: Props) {
  const alignCenter = getCommonValue(
    elements.map((element) => element.data.tiptap?.nodes?.attributes?.textAlign === 'center'),
  );
  return (
    <TextSettingsButton
      active={alignCenter}
      command={{ type: 'setTextAlign', value: 'center' }}
      elements={elements}
      Icon={AlignCenterIcon}
      title="webview.sidebar-element-settings.textSettings.alignCenterTooltip"
    />
  );
}

export function AlignRightButton({ elements }: Props) {
  const alignRight = getCommonValue(
    elements.map((element) => element.data.tiptap?.nodes?.attributes?.textAlign === 'right'),
  );
  return (
    <TextSettingsButton
      active={alignRight}
      command={{ type: 'setTextAlign', value: 'right' }}
      elements={elements}
      Icon={Bars3BottomRightIcon}
      title="webview.sidebar-element-settings.textSettings.alignRightTooltip"
    />
  );
}

export function AlignJustifyButton({ elements }: Props) {
  const alignJustify = getCommonValue(
    elements.map((element) => element.data.tiptap?.nodes?.attributes?.textAlign === 'justify'),
  );
  return (
    <TextSettingsButton
      active={alignJustify}
      command={{ type: 'setTextAlign', value: 'justify' }}
      elements={elements}
      Icon={Bars3Icon}
      title="webview.sidebar-element-settings.textSettings.alignJustifyTooltip"
    />
  );
}

export function BulletListButton({ elements }: Props) {
  const bulletList = getCommonValue(
    elements.map((element) => element.data.tiptap?.nodes?.bulletList),
  );
  return (
    <TextSettingsButton
      active={bulletList}
      command={{ type: 'toggleBulletList' }}
      elements={elements}
      Icon={ListBulletIcon}
      title="webview.sidebar-element-settings.textSettings.bulletListTooltip"
    />
  );
}

export function OrderedListButton({ elements }: Props) {
  const orderedList = getCommonValue(
    elements.map((element) => element.data.tiptap?.nodes?.orderedList),
  );
  return (
    <TextSettingsButton
      active={orderedList}
      command={{ type: 'toggleOrderedList' }}
      elements={elements}
      Icon={NumberedListIcon}
      title="webview.sidebar-element-settings.textSettings.orderedListTooltip"
    />
  );
}

export function AlignCenterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {' '}
      <path
        d="M9.25 6.75H14.75M3.75 12H20.25M6.5 17.25H17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />{' '}
    </svg>
  );
}

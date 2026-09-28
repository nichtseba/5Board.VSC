import { EditorElement, EditorElementType, TextEditorCommand } from '5board.vsc-common';
import { Button } from 'vscrui';
import { useMessageService } from '../../../../services/MessageService';
import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
  Bars4Icon,
  BoldIcon,
  CodeBracketIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from '@heroicons/react/24/outline';
import { getCommonValue } from '../utils/getCommonValue';

type IconType = React.ComponentType<{ className?: string }>;

type TextSettingsButtonProps = {
  active: boolean | undefined;
  command: TextEditorCommand;
  elements: EditorElement<EditorElementType.Text>[];
  Icon: IconType;
};

export function TextSettingsButton({ active, command, elements, Icon }: TextSettingsButtonProps) {
  const messages = useMessageService();
  return (
    <Button
      className="h-8 flex flex-col items-center justify-center gap-2"
      appearance={active ? 'primary' : 'secondary'}
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
      Icon={Bars3Icon}
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
      Icon={Bars4Icon}
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
    />
  );
}

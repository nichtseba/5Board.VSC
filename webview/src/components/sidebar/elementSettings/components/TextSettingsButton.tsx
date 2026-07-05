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
  StrikethroughIcon,
  UnderlineIcon,
} from '@heroicons/react/24/outline';

type IconType = React.ComponentType<{ className?: string }>;

type TextSettingsButtonProps = {
  active: boolean | undefined;
  command: TextEditorCommand;
  Icon: IconType;
};

export function TextSettingsButton({ active, command, Icon }: TextSettingsButtonProps) {
  const messages = useMessageService();
  return (
    <Button
      className="h-8 flex flex-col items-center justify-center gap-2"
      appearance={active ? 'primary' : 'secondary'}
      onClick={() =>
        messages.send({
          type: 'textEditorCommand',
          command,
        })
      }
    >
      <Icon className="size-5" />
    </Button>
  );
}

type Props = {
  element: EditorElement<EditorElementType.Text>;
};

export function BoldButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.marks?.bold}
      command={{ type: 'toggleBold' }}
      Icon={BoldIcon}
    />
  );
}

export function ItalicButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.marks?.italic}
      command={{ type: 'toggleItalic' }}
      Icon={ItalicIcon}
    />
  );
}

export function StrikeButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.marks?.strike}
      command={{ type: 'toggleStrike' }}
      Icon={StrikethroughIcon}
    />
  );
}

export function UnderlineButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.marks?.underline}
      command={{ type: 'toggleUnderline' }}
      Icon={UnderlineIcon}
    />
  );
}

export function CodeButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.marks?.code}
      command={{ type: 'toggleCode' }}
      Icon={CodeBracketIcon}
    />
  );
}

export function AlignLeftButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.nodes?.attributes?.textAlign === 'left'}
      command={{ type: 'setTextAlign', value: 'left' }}
      Icon={Bars3BottomLeftIcon}
    />
  );
}

export function AlignCenterButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.nodes?.attributes?.textAlign === 'center'}
      command={{ type: 'setTextAlign', value: 'center' }}
      Icon={Bars3Icon}
    />
  );
}

export function AlignRightButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.nodes?.attributes?.textAlign === 'right'}
      command={{ type: 'setTextAlign', value: 'right' }}
      Icon={Bars3BottomRightIcon}
    />
  );
}

export function AlignJustifyButton({ element }: Props) {
  return (
    <TextSettingsButton
      active={element.data.tiptap?.nodes?.attributes?.textAlign === 'justify'}
      command={{ type: 'setTextAlign', value: 'justify' }}
      Icon={Bars4Icon}
    />
  );
}

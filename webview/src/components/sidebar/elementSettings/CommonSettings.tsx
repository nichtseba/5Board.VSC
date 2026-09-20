import { EditorElement } from '5board.vsc-common';
import { getCommonValue } from './utils/getCommonValue';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  elements: EditorElement[];
};

export function CommonSettings({ elements }: Props) {
  const messages = useMessageService();

  const yPos = getCommonValue(elements.map((element) => element.layout.yPos));

  const handleYPosChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newYPos = Number(event.target.value);

    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          layout: {
            ...element.layout,
            yPos: newYPos,
          },
        },
      })),
    });
  };

  return (
    <>
      <input type="number" min={0} value={yPos ?? ''} onChange={handleYPosChange} />
    </>
  );
}

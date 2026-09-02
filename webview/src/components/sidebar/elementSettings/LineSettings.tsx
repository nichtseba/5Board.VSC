//import { EditorElement, EditorElementType } from '5board.vsc-common';
//import { useMessageService } from '../../../services/MessageService';

/**
 * Settings panel for Line elements
 * Allows configuration of stroke properties and arrow heads
 */
export function LineSettings() {
  //const messages = useMessageService();
  //const data = element.data as LineElementData;

  /*const updateData = (updates: Partial<LineElementData>) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        data: { ...data, ...updates },
      },
    });
  };*/

  return (
    <div className="space-y-4">
      {/* Stroke Color *
      <div>
        <label className="block text-sm font-semibold mb-2">Stroke Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={data.strokeColor || '#000000'}
            onChange={(e) => updateData({ strokeColor: e.target.value })}
            className="w-10 h-8 cursor-pointer"
          />
          <input
            type="text"
            value={data.strokeColor || '#000000'}
            onChange={(e) => updateData({ strokeColor: e.target.value })}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Stroke Width 
      <div>
        <label className="block text-sm font-semibold mb-2">
          Stroke Width: {data.strokeWidth || 2}px
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={data.strokeWidth || 2}
          onChange={(e) => updateData({ strokeWidth: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Stroke Style 
      <div>
        <label className="block text-sm font-semibold mb-2">Stroke Style</label>
        <select
          value={data.strokeStyle || 'solid'}
          onChange={(e) => updateData({ strokeStyle: e.target.value as any })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>

      {/* Head Type Start 
      <div>
        <label className="block text-sm font-semibold mb-2">Start Head</label>
        <select
          value={data.headTypeStart || 'none'}
          onChange={(e) => updateData({ headTypeStart: e.target.value as any })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        >
          <option value="none">None</option>
          <option value="arrow">Arrow</option>
          <option value="circle">Circle</option>
          <option value="square">Square</option>
        </select>
      </div>

      {/* Head Type End 
      <div>
        <label className="block text-sm font-semibold mb-2">End Head</label>
        <select
          value={data.headTypeEnd || 'none'}
          onChange={(e) => updateData({ headTypeEnd: e.target.value as any })}
          className="w-full px-2 py-1 border border-gray-300 rounded"
        >
          <option value="none">None</option>
          <option value="arrow">Arrow</option>
          <option value="circle">Circle</option>
          <option value="square">Square</option>
        </select>
      </div>

      {/* Head Size 
      <div>
        <label className="block text-sm font-semibold mb-2">
          Head Size: {data.headSize || 10}px
        </label>
        <input
          type="range"
          min="5"
          max="25"
          value={data.headSize || 10}
          onChange={(e) => updateData({ headSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Head Fill 
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.headFill !== false}
            onChange={(e) => updateData({ headFill: e.target.checked })}
          />
          <span className="text-sm font-semibold">Fill Head</span>
        </label>
      </div>
      */}
    </div>
  );
}

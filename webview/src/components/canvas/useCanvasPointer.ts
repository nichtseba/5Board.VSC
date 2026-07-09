import type React from 'react';
import { useCanvasEventDispatcher } from '../../providers/CanvasEventsProvider';

// Forwards canvas pointer events to the canvas event hub. Generic and reusable —
// no feature logic (cursor mirroring, tools, …) lives here. Subscribe to the hub
// via useCanvasEvents to react to these events. Spread the returned props onto
// the canvas element.
export function useCanvasPointer() {
  const { emit } = useCanvasEventDispatcher();

  return {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => emit('pointerDown', e.nativeEvent),
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => emit('pointerMove', e.nativeEvent),
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => emit('pointerUp', e.nativeEvent),
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) =>
      emit('pointerCancel', e.nativeEvent),
    onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => emit('pointerLeave', e.nativeEvent),
  };
}

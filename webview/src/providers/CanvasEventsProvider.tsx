import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

/**
 * Provides a central event hub for canvas interactions.
 *
 * The EditorCanvas forwards pointer events to this context, while tools and
 * other canvas features can subscribe to those events independently.
 *
 * This decouples canvas infrastructure from feature implementations and allows
 * new tools or overlays to be added without modifying the EditorCanvas.
 *
 * Event Regsitry with Generic Typing
 */

export type CanvasEventMap = {
  pointerDown: PointerEvent;
  pointerMove: PointerEvent;
  pointerUp: PointerEvent;
  pointerCancel: PointerEvent;
};

export type CanvasEventHandlers = {
  [K in keyof CanvasEventMap]?: (event: CanvasEventMap[K]) => void;
};

type CanvasEventContextType = {
  subscribe: (handlers: CanvasEventHandlers) => () => void;

  emit: <K extends keyof CanvasEventMap>(type: K, event: CanvasEventMap[K]) => void;
};

// Context
const CanvasEventContext = createContext<CanvasEventContextType | null>(null);

export function CanvasEventsProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef(new Set<CanvasEventHandlers>());

  const subscribe = useCallback((handlers: CanvasEventHandlers) => {
    listenersRef.current.add(handlers);
    return () => {
      listenersRef.current.delete(handlers);
    };
  }, []);

  const emit = useCallback(<K extends keyof CanvasEventMap>(type: K, event: CanvasEventMap[K]) => {
    listenersRef.current.forEach((listener) => {
      listener[type]?.(event);
    });
  }, []);

  const value = useMemo(
    () => ({
      subscribe,
      emit,
    }),
    [subscribe, emit],
  );

  return <CanvasEventContext.Provider value={value}>{children}</CanvasEventContext.Provider>;
}

// Hook: Listen for Events
export function useCanvasEvents(handlers: CanvasEventHandlers) {
  const context = useContext(CanvasEventContext);

  if (!context) {
    throw new Error('useCanvasEvents must be used inside CanvasEventProvider');
  }

  useEffect(() => {
    return context.subscribe(handlers);
  }, [context, handlers]);
}

// Hook: Send Events
export function useCanvasEventDispatcher() {
  const context = useContext(CanvasEventContext);

  if (!context) {
    throw new Error('useCanvasEventDispatcher must be used inside CanvasEventProvider');
  }

  return {
    emit: context.emit,
  };
}

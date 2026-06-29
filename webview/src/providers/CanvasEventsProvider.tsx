import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { calculateCanvasPoint } from '../components/projector/calculateCanvasPoint';

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
  pointerLeave: PointerEvent;
  scroll: Event;
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
  const [scrollSubscribers, setScrollSubscribers] = useState(0);

  const refreshScrollSubscribers = useCallback(() => {
    let count = 0;
    listenersRef.current.forEach((listener) => {
      if (listener.scroll) count++;
    });
    setScrollSubscribers(count);
  }, []);

  const subscribe = useCallback(
    (handlers: CanvasEventHandlers) => {
      listenersRef.current.add(handlers);
      refreshScrollSubscribers();
      return () => {
        listenersRef.current.delete(handlers);
        refreshScrollSubscribers();
      };
    },
    [refreshScrollSubscribers],
  );

  const emit = useCallback(<K extends keyof CanvasEventMap>(type: K, event: CanvasEventMap[K]) => {
    listenersRef.current.forEach((listener) => {
      listener[type]?.(event);
    });
  }, []);

  useEffect(() => {
    if (scrollSubscribers === 0) {
      return;
    }
    console.log('[5board] scroll hub: window listener attached');
    const handleScroll = (event: Event) => emit('scroll', event);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      console.log('[5board] scroll hub: window listener removed');
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollSubscribers, emit]);

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

// Hook: Convert a canvas pointer event into a normalized (0–1) canvas position
export function useCanvasPoint() {
  return calculateCanvasPoint;
}

import '@testing-library/jest-dom/vitest'

// jsdom no implementa ResizeObserver, y el Checkbox de Radix lo usa para medir su indicador.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

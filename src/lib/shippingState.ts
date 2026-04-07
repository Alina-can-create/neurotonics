import type { ShippingOption } from './shipping';

export interface ShippingSelectionState {
  postcode: string;
  country: string;
  selectedOptionId: string;
  selectedOption: ShippingOption;
}

const STORAGE_KEY = 'neurotonics-shipping';

export function saveShippingSelection(state: ShippingSelectionState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — silently ignore
  }
}

export function loadShippingSelection(): ShippingSelectionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ShippingSelectionState) : null;
  } catch {
    return null;
  }
}

export function clearShippingSelection(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — silently ignore
  }
}

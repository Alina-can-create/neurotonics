import type { ShippingOption } from './shipping';

export interface ShippingSelectionState {
  postcode: string;
  country: string;
  selectedOptionId: string;
  selectedOption: ShippingOption;
}

const STORAGE_KEY = 'neurotonics-shipping';

function isValidShippingOption(value: unknown): value is ShippingOption {
  if (!value || typeof value !== 'object') return false;
  const opt = value as Record<string, unknown>;
  return (
    typeof opt.id === 'string' &&
    typeof opt.name === 'string' &&
    typeof opt.description === 'string' &&
    typeof opt.fee === 'number' &&
    typeof opt.estimatedDays === 'string' &&
    typeof opt.recommended === 'boolean'
  );
}

function isValidShippingState(value: unknown): value is ShippingSelectionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.postcode === 'string' &&
    typeof state.country === 'string' &&
    typeof state.selectedOptionId === 'string' &&
    isValidShippingOption(state.selectedOption)
  );
}

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
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isValidShippingState(parsed) ? parsed : null;
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart';
import { saveShippingSelection, loadShippingSelection } from '@/lib/shippingState';
import type { ShippingOption } from '@/lib/shipping';
import shippingContent from '@/content/shipping.json';

const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'SG', name: 'Singapore' },
  { code: 'OTHER', name: 'Other country' },
];

export default function CartClient() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  const [country, setCountry] = useState('AU');
  const [postcode, setPostcode] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [shippingError, setShippingError] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [locationCalculated, setLocationCalculated] = useState(false);
  const [calculatedAtSubtotal, setCalculatedAtSubtotal] = useState<number | null>(null);

  const selectedOption = shippingOptions.find((o) => o.id === selectedOptionId) ?? null;
  const shippingFee = selectedOption?.fee ?? 0;
  const total = subtotal + shippingFee;
  const canCheckout = locationCalculated && !!selectedOptionId;
  const shippingOutdated = calculatedAtSubtotal !== null && calculatedAtSubtotal !== subtotal;
  const freeThreshold = shippingContent.freeShippingThreshold;
  const amountToFree = freeThreshold ? Math.max(0, freeThreshold - subtotal) : 0;

  const runCalculation = useCallback(
    async (pc: string, ct: string, st: number, savedOptionId?: string) => {
      setShippingLoading(true);
      setShippingError('');
      try {
        const { getShippingOptions } = await import('@/lib/shipping');
        const options = getShippingOptions(pc, ct, st);
        setShippingOptions(options);
        setLocationCalculated(true);
        setCalculatedAtSubtotal(st);

        const recommended = options.find((o) => o.recommended) ?? options[0];
        const toSelect = savedOptionId
          ? (options.find((o) => o.id === savedOptionId) ?? recommended)
          : recommended;
        if (toSelect) {
          setSelectedOptionId(toSelect.id);
          saveShippingSelection({ postcode: pc, country: ct, selectedOptionId: toSelect.id, selectedOption: toSelect });
        }
      } catch {
        setShippingError('Failed to calculate shipping. Please try again.');
      } finally {
        setShippingLoading(false);
      }
    },
    []
  );

  // Restore saved shipping on mount
  useEffect(() => {
    const saved = loadShippingSelection();
    if (!saved) return;
    setCountry(saved.country ?? 'AU');
    setPostcode(saved.postcode ?? '');
    void runCalculation(saved.postcode ?? '', saved.country ?? 'AU', subtotal, saved.selectedOptionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalculate = () => {
    if (country !== 'AU') {
      void runCalculation('', country, subtotal);
      return;
    }
    if (!/^\d{4}$/.test(postcode)) {
      setShippingError('Please enter a valid 4-digit Australian postcode.');
      return;
    }
    void runCalculation(postcode, country, subtotal);
  };

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
    const option = shippingOptions.find((o) => o.id === optionId);
    if (option) {
      saveShippingSelection({ postcode, country, selectedOptionId: optionId, selectedOption: option });
    }
  };

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setShippingOptions([]);
    setSelectedOptionId('');
    setLocationCalculated(false);
    setShippingError('');
    setCalculatedAtSubtotal(null);
    if (newCountry !== 'AU') {
      void runCalculation('', newCountry, subtotal);
    }
  };

  if (items.length === 0) {
    return (
      <main className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h1>
          <p className="text-gray-500 mb-8">Add some products to get started.</p>
          <Link
            href="/product"
            className="inline-flex items-center px-6 py-3 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-xl transition-all duration-300"
          >
            Shop Brain Boost 1000
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {/* Free shipping progress banner */}
        {freeThreshold && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            subtotal >= freeThreshold
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-brand-primary-light text-brand-primary border border-brand-primary/20'
          }`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {subtotal >= freeThreshold
              ? 'You qualify for free shipping!'
              : `Add $${amountToFree.toFixed(2)} more to get free shipping (Australia)`}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-gray-200">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={80} height={80} className="w-full h-full object-contain" />
                  ) : (
                    <svg className="w-8 h-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-medium truncate">{item.name}</h3>
                  <p className="text-brand-primary font-semibold">${item.price.toFixed(2)} AUD</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-gray-900 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {/* Shipping & Delivery section */}
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Shipping &amp; Delivery
                  </h3>

                  {/* Country selector */}
                  <div className="space-y-2 mb-3">
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-xs focus:outline-none focus:border-brand-primary transition-colors"
                      aria-label="Select country"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>

                    {/* Postcode input — Australia only */}
                    {country === 'AU' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
                          placeholder="Postcode (e.g. 2000)"
                          maxLength={4}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-brand-primary transition-colors"
                          aria-label="Australian postcode"
                        />
                        <button
                          onClick={handleCalculate}
                          disabled={shippingLoading || postcode.length !== 4}
                          className="px-3 py-2 bg-brand-primary-light text-brand-primary border border-brand-primary/20 rounded-lg hover:bg-brand-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                        >
                          {shippingLoading ? '…' : 'Go'}
                        </button>
                      </div>
                    )}
                  </div>

                  {shippingError && (
                    <p className="text-red-500 text-xs mb-2" role="alert">{shippingError}</p>
                  )}

                  {shippingOutdated && (
                    <p className="text-amber-600 text-xs mb-2">
                      Cart updated —{' '}
                      <button onClick={handleCalculate} className="underline font-medium">
                        recalculate shipping
                      </button>
                    </p>
                  )}

                  {/* Shipping option cards */}
                  {shippingOptions.length > 0 && (
                    <div className="space-y-2" role="radiogroup" aria-label="Shipping options">
                      {shippingOptions.map((option) => (
                        <button
                          key={option.id}
                          role="radio"
                          aria-checked={selectedOptionId === option.id}
                          onClick={() => handleSelectOption(option.id)}
                          className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 ${
                            selectedOptionId === option.id
                              ? 'border-brand-primary bg-brand-primary-light shadow-sm'
                              : 'border-gray-200 hover:border-brand-primary/40 hover:bg-gray-50'
                          }`}
                        >
                          {/* Radio indicator */}
                          <div
                            className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              selectedOptionId === option.id ? 'border-brand-primary' : 'border-gray-300'
                            }`}
                          >
                            {selectedOptionId === option.id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-gray-900 font-medium text-xs leading-tight">
                                {option.name}
                                {option.recommended && option.id !== 'free' && (
                                  <span className="ml-1.5 text-brand-primary text-xs">(Recommended)</span>
                                )}
                              </span>
                              <span className={`font-semibold text-xs flex-shrink-0 ${option.fee === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {option.fee === 0 ? 'FREE' : `$${option.fee.toFixed(2)}`}
                              </span>
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">{option.estimatedDays}</p>
                          </div>

                          {option.badge && (
                            <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              {option.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shipping cost line */}
                {selectedOption && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className={selectedOption.fee === 0 ? 'text-green-600 font-medium' : ''}>
                      {selectedOption.fee === 0 ? 'FREE' : `$${selectedOption.fee.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 flex justify-between text-gray-900 font-semibold text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)} AUD</span>
                </div>
              </div>

              {canCheckout ? (
                <Link
                  href="/checkout"
                  className="block w-full mt-6 py-3.5 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-xl transition-all duration-300 text-center"
                >
                  Proceed to Checkout
                </Link>
              ) : (
                <button
                  disabled
                  title={country === 'AU' && !locationCalculated ? 'Enter your postcode to calculate shipping' : undefined}
                  className="block w-full mt-6 py-3.5 bg-gray-300 text-gray-500 font-semibold rounded-xl cursor-not-allowed text-center"
                >
                  {country === 'AU' && !locationCalculated
                    ? 'Enter postcode to continue'
                    : 'Select a shipping option'}
                </button>
              )}

              {!canCheckout && country === 'AU' && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  Enter your postcode to calculate delivery options
                </p>
              )}

              <Link
                href="/product"
                className="block w-full mt-3 py-2.5 text-center text-brand-primary hover:text-brand-primary text-sm transition-colors"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import shippingData from '@/content/shipping.json';

export interface ShippingResult {
  zone: string;
  fee: number;
  estimatedDays: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  fee: number;
  estimatedDays: string;
  recommended: boolean;
  badge?: string;
}

function findZoneByPostcode(postcode: string): ShippingResult {
  const code = postcode.trim();

  // Sort zones by specificity — more specific (smaller ranges) first
  const sortedZones = [...shippingData.zones].sort((a, b) => {
    const aRange = a.postcodeRanges.reduce((acc, r) => acc + (parseInt(r.to) - parseInt(r.from)), 0);
    const bRange = b.postcodeRanges.reduce((acc, r) => acc + (parseInt(r.to) - parseInt(r.from)), 0);
    return aRange - bRange;
  });

  for (const zone of sortedZones) {
    for (const range of zone.postcodeRanges) {
      const postcodeNum = parseInt(code);
      const fromNum = parseInt(range.from);
      const toNum = parseInt(range.to);

      if (postcodeNum >= fromNum && postcodeNum <= toNum) {
        return {
          zone: zone.name,
          fee: zone.fee,
          estimatedDays: zone.estimatedDays,
        };
      }
    }
  }

  return {
    zone: 'Standard',
    fee: shippingData.defaultFee,
    estimatedDays: shippingData.defaultEstimatedDays,
  };
}

/**
 * Returns all available shipping options for a given location and cart subtotal.
 * For Australia, options include Free (if eligible), Standard, and Express.
 * For international, a single flat-rate option is returned.
 */
export function getShippingOptions(postcode: string, country: string, subtotal: number): ShippingOption[] {
  if (country !== 'AU') {
    return [
      {
        id: 'international',
        name: shippingData.international.name,
        description: 'Tracked international delivery',
        fee: shippingData.international.fee,
        estimatedDays: shippingData.international.estimatedDays,
        recommended: true,
      },
    ];
  }

  const zone = findZoneByPostcode(postcode);
  const threshold = shippingData.freeShippingThreshold;
  const isFreeEligible = threshold !== null && subtotal >= threshold;
  const options: ShippingOption[] = [];

  if (isFreeEligible) {
    options.push({
      id: 'free',
      name: 'Free Shipping',
      description: zone.zone,
      fee: 0,
      estimatedDays: zone.estimatedDays,
      recommended: true,
      badge: 'FREE',
    });
  }

  options.push({
    id: 'standard',
    name: 'Standard Shipping',
    description: zone.zone,
    fee: zone.fee,
    estimatedDays: zone.estimatedDays,
    recommended: !isFreeEligible,
  });

  options.push({
    id: 'express',
    name: shippingData.expressShipping.name,
    description: 'Priority tracked delivery',
    fee: shippingData.expressShipping.fee,
    estimatedDays: shippingData.expressShipping.estimatedDays,
    recommended: false,
  });

  return options;
}

/** Returns a single shipping result for a given Australian postcode (for API use). */
export function calculateShipping(postcode: string): ShippingResult {
  return findZoneByPostcode(postcode);
}

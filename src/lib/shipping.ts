import shippingData from '@/content/shipping.json';

export interface ShippingResult {
  zone: string;
  fee: number;
  estimatedDays: string;
}

export function calculateShipping(postcode: string): ShippingResult {
  const code = postcode.trim();
  
  // Sort zones by specificity - more specific (smaller ranges) first
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

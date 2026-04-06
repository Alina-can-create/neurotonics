import { NextRequest, NextResponse } from 'next/server';
import { calculateShipping } from '@/lib/shipping';

export async function POST(request: NextRequest) {
  try {
    const { postcode } = await request.json();

    if (!postcode || typeof postcode !== 'string') {
      return NextResponse.json({ error: 'Invalid postcode' }, { status: 400 });
    }

    // Validate Australian postcode format (4 digits)
    const postcodeRegex = /^\d{4}$/;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json({ error: 'Please enter a valid 4-digit Australian postcode' }, { status: 400 });
    }

    const result = calculateShipping(postcode);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Shipping calculation failed:', error);
    return NextResponse.json(
      { error: 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}

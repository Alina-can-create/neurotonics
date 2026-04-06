import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { calculateShipping } from '@/lib/shipping';

const postcodeSchema = z.object({
  postcode: z.string().regex(/^\d{4}$/, 'Please enter a valid 4-digit Australian postcode'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = postcodeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid postcode' },
        { status: 400 }
      );
    }

    const shippingResult = calculateShipping(result.data.postcode);
    return NextResponse.json(shippingResult);
  } catch (error) {
    console.error('Shipping calculation failed:', error);
    return NextResponse.json(
      { error: 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}

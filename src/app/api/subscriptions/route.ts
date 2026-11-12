import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function calculateYearlyCost(amount: number, frequency: string): number {
  const freq = (frequency || 'monthly').toLowerCase();
  switch (freq) {
    case 'yearly':
    case 'annual':
      return amount;
    case 'quarterly':
      return amount * 4;
    case 'weekly':
      return amount * 52;
    case 'monthly':
    default:
      return amount * 12;
  }
}

export async function GET() {
  try {
    const subscriptions = await prisma.subscriptionItem.findMany({
      orderBy: { estimatedYearlyCost: 'desc' },
    });
    return NextResponse.json(subscriptions);
  } catch (err: unknown) {
    console.error('Subscriptions GET failed:', err);
    return NextResponse.json({ error: 'Failed to retrieve subscriptions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant, amount, currency = '₹', frequency = 'monthly', status = 'ACTIVE' } = body;

    if (!merchant || typeof merchant !== 'string' || !merchant.trim()) {
      return NextResponse.json({ error: 'Merchant name is required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
    }

    const estimatedYearlyCost = calculateYearlyCost(numAmount, frequency);

    const created = await prisma.subscriptionItem.create({
      data: {
        merchant: merchant.trim(),
        amount: numAmount,
        currency: currency || '₹',
        frequency: frequency || 'monthly',
        estimatedYearlyCost,
        status: status || 'ACTIVE',
        confidence: 'HIGH',
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    console.error('Subscriptions POST failed:', err);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, merchant, amount, currency, frequency, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = await prisma.subscriptionItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const numAmount = amount !== undefined ? Number(amount) : existing.amount;
    const finalFreq = frequency !== undefined ? frequency : existing.frequency;
    const estimatedYearlyCost = calculateYearlyCost(numAmount, finalFreq);

    const updated = await prisma.subscriptionItem.update({
      where: { id },
      data: {
        merchant: merchant !== undefined ? merchant.trim() : undefined,
        amount: amount !== undefined ? numAmount : undefined,
        currency: currency !== undefined ? currency : undefined,
        frequency: frequency !== undefined ? finalFreq : undefined,
        estimatedYearlyCost,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Subscriptions PUT failed:', err);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const updated = await prisma.subscriptionItem.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Subscriptions PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.subscriptionItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Subscriptions DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.analysis.findUnique({
      where: { id },
      include: {
        inputs: true,
        tasks: true,
        subscriptions: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Analysis record not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err: unknown) {
    console.error('History item GET failed:', err);
    return NextResponse.json({ error: 'Failed to retrieve analysis record' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.analysis.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully' });
  } catch (err: unknown) {
    console.error('History item DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}


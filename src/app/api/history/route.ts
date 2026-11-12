import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const intent = searchParams.get('intent')?.trim();
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.AnalysisWhereInput = {};

    if (intent && intent !== 'ALL') {
      where.intent = intent;
    }

    if (search && search.length > 0) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { processedText: { contains: search } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.analysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          inputs: true,
          _count: {
            select: {
              tasks: true,
              subscriptions: true,
            },
          },
        },
      }),
      prisma.analysis.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: unknown) {
    console.error('History GET failed:', err);
    return NextResponse.json({ error: 'Failed to retrieve analysis history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const deleteCount = await prisma.analysis.deleteMany({});
    return NextResponse.json({
      success: true,
      deletedCount: deleteCount.count,
      message: 'All local history and extracted records permanently wiped.',
    });
  } catch (err: unknown) {
    console.error('History DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await prisma.taskItem.findMany({
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(tasks);
  } catch (err: unknown) {
    console.error('Tasks GET failed:', err);
    return NextResponse.json({ error: 'Failed to retrieve tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, dueDate, time, priority, person, notes, analysisId } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const newTask = await prisma.taskItem.create({
      data: {
        title: title.trim(),
        dueDate: dueDate?.trim() || null,
        time: time?.trim() || null,
        priority: priority || 'MEDIUM',
        person: person?.trim() || null,
        notes: notes?.trim() || null,
        completed: false,
        analysisId: analysisId || null,
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (err: unknown) {
    console.error('Tasks POST failed:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, dueDate, time, priority, person, notes, completed } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updated = await prisma.taskItem.update({
      where: { id },
      data: {
        title: title?.trim(),
        dueDate: dueDate !== undefined ? (dueDate?.trim() || null) : undefined,
        time: time !== undefined ? (time?.trim() || null) : undefined,
        priority: priority || undefined,
        person: person !== undefined ? (person?.trim() || null) : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
        completed: typeof completed === 'boolean' ? completed : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Tasks PUT failed:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, completed } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updated = await prisma.taskItem.update({
      where: { id },
      data: {
        completed: typeof completed === 'boolean' ? completed : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Tasks PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to toggle task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearCompleted = searchParams.get('clearCompleted');

    if (clearCompleted === 'true') {
      await prisma.taskItem.deleteMany({
        where: { completed: true },
      });
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await prisma.taskItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Tasks DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

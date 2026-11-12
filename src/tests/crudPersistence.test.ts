import { describe, it, expect } from 'vitest';
import { prisma } from '../lib/db/prisma';

describe('Local Database CRUD & Persistence Tests', () => {
  it('TaskItem: Create, Read, Update, Toggle, Delete', async () => {
    // 1. Create
    const task = await prisma.taskItem.create({
      data: {
        title: 'Verify electric meter reading',
        dueDate: 'Tomorrow',
        priority: 'HIGH',
        person: 'Ramesh',
        completed: false,
      },
    });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Verify electric meter reading');
    expect(task.completed).toBe(false);

    // 2. Read
    const found = await prisma.taskItem.findUnique({ where: { id: task.id } });
    expect(found).not.toBeNull();
    expect(found?.priority).toBe('HIGH');

    // 3. Update & Toggle
    const updated = await prisma.taskItem.update({
      where: { id: task.id },
      data: { completed: true, notes: 'Meter read confirmed: 1420 kWh' },
    });
    expect(updated.completed).toBe(true);
    expect(updated.notes).toContain('1420 kWh');

    // 4. Delete
    await prisma.taskItem.delete({ where: { id: task.id } });
    const afterDelete = await prisma.taskItem.findUnique({ where: { id: task.id } });
    expect(afterDelete).toBeNull();
  });

  it('SubscriptionItem: Create, Read, Update, Status Toggle, Delete', async () => {
    // 1. Create
    const sub = await prisma.subscriptionItem.create({
      data: {
        merchant: 'Netflix Premium 4K',
        amount: 649,
        currency: '₹',
        frequency: 'monthly',
        estimatedYearlyCost: 649 * 12,
        status: 'ACTIVE',
      },
    });
    expect(sub.id).toBeDefined();
    expect(sub.estimatedYearlyCost).toBe(7788);

    // 2. Read
    const found = await prisma.subscriptionItem.findUnique({ where: { id: sub.id } });
    expect(found?.merchant).toBe('Netflix Premium 4K');

    // 3. Toggle Status to CANCELLED
    const cancelled = await prisma.subscriptionItem.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    });
    expect(cancelled.status).toBe('CANCELLED');

    // 4. Delete
    await prisma.subscriptionItem.delete({ where: { id: sub.id } });
    const afterDelete = await prisma.subscriptionItem.findUnique({ where: { id: sub.id } });
    expect(afterDelete).toBeNull();
  });

  it('Analysis History: Create, Read with Cascade, Delete', async () => {
    // 1. Create Analysis record
    const analysis = await prisma.analysis.create({
      data: {
        title: 'Suspicious Bank SMS Alert',
        intent: 'SCAM_ANALYSIS',
        inputType: 'text',
        summary: 'High risk phishing attempt detected',
        riskLevel: 'HIGH',
        resultJson: JSON.stringify({ type: 'SCAM_ANALYSIS', data: { riskLevel: 'HIGH' } }),
      },
    });
    expect(analysis.id).toBeDefined();

    // 2. Read
    const found = await prisma.analysis.findUnique({ where: { id: analysis.id } });
    expect(found?.intent).toBe('SCAM_ANALYSIS');

    // 3. Delete
    await prisma.analysis.delete({ where: { id: analysis.id } });
    const afterDelete = await prisma.analysis.findUnique({ where: { id: analysis.id } });
    expect(afterDelete).toBeNull();
  });
});


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const records = await prisma.analysis.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        inputs: true,
        tasks: true,
        subscriptions: true,
      },
    });

    if (format === 'markdown') {
      const mdSections = records.map((r) => {
        let parsedResult: Record<string, unknown> = {};
        try {
          parsedResult = JSON.parse(r.resultJson);
        } catch {
          // ignore
        }

        return `## ${r.title}
- **Intent**: ${r.intent}
- **Input Type**: ${r.inputType}
- **Date**: ${r.createdAt.toISOString()}
- **Model Used**: ${r.aiModelUsed || 'Fallback'}
- **Confidence**: ${(r.confidence * 100).toFixed(0)}%
${r.riskLevel ? `- **Risk Level**: ${r.riskLevel}\n` : ''}
### Summary
${r.summary}

### Extracted Details
\`\`\`json
${JSON.stringify(parsedResult, null, 2)}
\`\`\`
---
`;
      });

      const markdownContent = `# FixMate Exported Local Analyses
Generated: ${new Date().toISOString()}
Total Records: ${records.length}

${mdSections.join('\n')}
`;

      return new NextResponse(markdownContent, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fixmate_export.md"',
        },
      });
    }

    // Default: JSON Export
    return new NextResponse(JSON.stringify(records, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="fixmate_export.json"',
      },
    });
  } catch (err: unknown) {
    console.error('Export failed:', err);
    return NextResponse.json({ error: 'Failed to export history' }, { status: 500 });
  }
}


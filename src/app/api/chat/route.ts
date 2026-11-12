import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { OllamaProvider } from '@/lib/ai/ollamaProvider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ollama = new OllamaProvider();

interface ChatRequestBody {
  analysisId?: string;
  message: string;
  language?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { analysisId, message, language = 'English', history = [] } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const trimmedMsg = message.trim();

    // 1. Contextualize with previous analysis if provided
    let contextHeader = '';
    let analysisRecord: any = null;

    if (analysisId) {
      try {
        analysisRecord = await prisma.analysis.findUnique({
          where: { id: analysisId },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 10,
            },
          },
        });

        if (analysisRecord) {
          contextHeader = `
CONTEXT OF CURRENT SOLVE:
- Topic: ${analysisRecord.title}
- Problem Category: ${analysisRecord.intent}
- Initial Summary: ${analysisRecord.summary}
- Risk Level: ${analysisRecord.riskLevel || 'N/A'}
- Extracted Data: ${analysisRecord.resultJson ? analysisRecord.resultJson.substring(0, 1500) : 'N/A'}
`.trim();
        }
      } catch (err) {
        console.warn('Could not load analysis context for follow-up:', err);
      }
    }

    // 2. Check Ollama availability
    let assistantReply = '';
    let suggestedFollowUps: string[] = [];
    const health = await ollama.checkHealth();

    if (health.isAvailable && health.hasRequiredModel) {
      // LLM-powered contextual response
      try {
        const systemPrompt = `You are FixMate, an intelligent, private, offline-first personal problem solver assistant.
The user is continuing a conversation about a problem they previously asked FixMate to solve.
Respond directly, warmly, and with clear, practical, bulleted instructions where helpful.
Never invent fake specifications, passwords, or claims.
Respond in the language requested: ${language}.
${contextHeader ? `\n${contextHeader}` : ''}
`;

        const conversationContext = history
          .map((h) => `${h.role === 'user' ? 'User' : 'FixMate'}: ${h.content}`)
          .join('\n');

        const prompt = `${conversationContext ? `${conversationContext}\n` : ''}User: ${trimmedMsg}\nFixMate:`;

        const completion = await ollama.generateCompletion(prompt, {
          systemPrompt,
          temperature: 0.3,
        });

        assistantReply = completion.text.trim();
      } catch (e) {
        console.warn('Ollama completion error during chat, falling back to deterministic reply:', e);
      }
    }

    // 3. Deterministic Fallback if Ollama was unavailable or failed
    if (!assistantReply) {
      assistantReply = generateDeterministicReply(trimmedMsg, analysisRecord, language);
    }

    // Dynamic suggested follow-ups
    suggestedFollowUps = generateFollowUpSuggestions(analysisRecord?.intent, trimmedMsg);

    // 4. Save messages to SQLite if analysisId is attached
    if (analysisId && analysisRecord) {
      try {
        await prisma.chatMessage.create({
          data: {
            analysisId,
            role: 'user',
            content: trimmedMsg,
          },
        });

        await prisma.chatMessage.create({
          data: {
            analysisId,
            role: 'assistant',
            content: assistantReply,
          },
        });
      } catch (err) {
        console.warn('Failed to persist chat messages to SQLite:', err);
      }
    }

    return NextResponse.json({
      messageId: `msg_${Date.now()}`,
      role: 'assistant',
      content: assistantReply,
      suggestedFollowUps,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json(
      { error: error?.message || 'Chat service error' },
      { status: 500 }
    );
  }
}

/**
 * Deterministic Fallback conversational engine
 */
function generateDeterministicReply(
  userQuery: string,
  analysis: any,
  language: string
): string {
  const queryLower = userQuery.toLowerCase();
  const intent = analysis?.intent || 'GENERAL_QUESTION';

  // Scam / Phishing follow-ups
  if (intent === 'SCAM_ANALYSIS' || queryLower.includes('clicked') || queryLower.includes('otp') || queryLower.includes('scam')) {
    if (queryLower.includes('clicked') || queryLower.includes('open') || queryLower.includes('entered') || queryLower.includes('given')) {
      return `### Immediate Containment Steps:\n\n1. **Disconnect Network**: Turn off Wi-Fi and Mobile Data immediately to prevent unauthorized background transfers.\n2. **Bank / Payment Alert**: If you entered banking credentials or card numbers, contact your bank's 24x7 fraud hotline immediately to freeze the account/card.\n3. **Change Passwords**: From another trusted device, immediately change passwords for your primary email and banking apps.\n4. **Check Installed Apps**: Go to phone Settings → Apps, and uninstall any recently added APK or unfamiliar app (e.g. AnyDesk, QuickSupport, TeamViewer).\n5. **Report Cyber Fraud**: In India, report immediately at **cybercrime.gov.in** or call helpline **1930**.`;
    }
    if (queryLower.includes('block') || queryLower.includes('number') || queryLower.includes('report')) {
      return `### How to Block and Report This:\n\n1. **In Messaging App**: Tap the sender profile → select "Block and Report Spam".\n2. **Do Not Reply**: Never reply with "STOP" or anger—scammers use replies to verify that your number is active.\n3. **Forward to Carrier**: Most telecom operators have a spam reporting shortcode (e.g. 1909 for DND in India).\n4. **Keep Screenshots**: Keep the screenshot of the message safely for any required dispute documentation.`;
    }
  }

  // Bill follow-ups
  if (intent === 'BILL_EXPLANATION' || queryLower.includes('bill') || queryLower.includes('charge') || queryLower.includes('pay')) {
    if (queryLower.includes('dispute') || queryLower.includes('wrong') || queryLower.includes('complain') || queryLower.includes('reduce')) {
      return `### How to Dispute This Charge:\n\n1. **Document the Discrepancy**: Note down the specific line item or extra units recorded on this statement.\n2. **Compare Previous Month**: Check if consumption units (kWh/GB) suddenly spiked without a change in usage.\n3. **Contact Billing Support**: Call the provider customer care number listed on your bill header.\n4. **Request a Meter Re-check or Service Audit**: Ask for an itemized meter log or billing adjustment reference number.`;
    }
  }

  // Subscription follow-ups
  if (intent === 'SUBSCRIPTION_ANALYSIS' || queryLower.includes('cancel') || queryLower.includes('refund')) {
    return `### How to Cancel This Subscription:\n\n1. **On Android (Google Play)**: Open Play Store → tap Profile icon → Payments & Subscriptions → Subscriptions → tap merchant → Cancel Subscription.\n2. **On iPhone (Apple)**: Settings → tap your Name → Subscriptions → tap merchant → Cancel.\n3. **Direct Merchant Site**: Log into your web account → Settings / Billing → Subscriptions → Turn Off Auto-Renewal.\n4. **Payment Mandate / Autopay**: Check your UPI app (Google Pay / PhonePe / Paytm) under "Autopay" or "Recurring Payments" and revoke the mandate.`;
  }

  // Error fix follow-ups
  if (intent === 'TECHNICAL_ERROR' || queryLower.includes('error') || queryLower.includes('command') || queryLower.includes('terminal')) {
    return `### Next Steps for This Error:\n\n1. Verify all prerequisites and dependencies are installed and in your system PATH.\n2. Run the command with verbose logging enabled (e.g. with \`--verbose\` or check the application logs).\n3. Ensure file permissions allow read/write access in your working folder.\n4. If the error mentions a locked port or file, stop lingering background processes and retry.`;
  }

  // Product follow-ups
  if (intent === 'PRODUCT_ANALYSIS' || queryLower.includes('worth') || queryLower.includes('buy') || queryLower.includes('price')) {
    return `### Purchase Evaluation Checklist:\n\n1. **Confirm Exact Specs**: Verify that the RAM, storage, and battery meet your daily requirements.\n2. **Check Warranty & Return Policy**: Ensure at least a 7-day replacement window is offered by the seller.\n3. **Compare Market Price**: Check if this model is older stock before paying full launch price.\n4. **Assess Real Value**: If you already own a device from the previous generation, the incremental upgrade might not justify the cost.`;
  }

  // General helpful response
  return `### Regarding: ${analysis?.title || 'Your Query'}\n\nBased on your previous analysis, here is what you need to know:\n\n- ${analysis?.summary || 'FixMate analyzed this item.'}\n- If you need to take further action, you can add this as a checklist item in your **Tasks** tab.\n- Feel free to ask more specific questions about any line item, error code, or next step!`;
}

function generateFollowUpSuggestions(intent?: string, lastQuery?: string): string[] {
  switch (intent) {
    case 'SCAM_ANALYSIS':
      return [
        'What should I do if I already clicked it?',
        'How can I block this sender?',
        'Can you write a complaint message?',
      ];
    case 'BILL_EXPLANATION':
      return [
        'How do I dispute an extra charge?',
        'How to reduce next month bill?',
        'Is there any late fee penalty?',
      ];
    case 'SUBSCRIPTION_ANALYSIS':
      return [
        'How do I cancel this subscription?',
        'How to stop UPI autopay mandate?',
        'Can I get a refund for this month?',
      ];
    case 'TECHNICAL_ERROR':
      return [
        'What if the command fails with EPERM?',
        'How do I check if the port is busy?',
        'Can you explain why this happened?',
      ];
    case 'PRODUCT_ANALYSIS':
      return [
        'Is there a better alternative at this price?',
        'What are the main drawbacks?',
        'Should I wait for a price drop?',
      ];
    default:
      return [
        'Can you explain this in simpler terms?',
        'What is the very next action I should take?',
        'Add a reminder for this to My Tasks',
      ];
  }
}

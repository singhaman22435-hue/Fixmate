/**
 * FixMate Deterministic Fallback Engine
 * Provides offline, zero-AI parsing, regex extraction, and structured outputs
 * when local Ollama is offline or unavailable.
 */

import {
  BillAnalysisResult,
  GeneralHelpResult,
  ProductAnalysisResult,
  ScamCheckResult,
  ScreenshotFixResult,
  SubscriptionAnalysisResult,
  VoiceTaskResult,
  DetectedSubscription,
} from '../analyzers/types';

export class DeterministicFallbackEngine {
  /**
   * Technical Error Fallback
   */
  static analyzeError(rawText: string): ScreenshotFixResult {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // Check specific error patterns
    if (lower.includes('eaddrinuse') || lower.includes('address already in use')) {
      const portMatch = text.match(/(?:port|address).*?(\d{4,5})/i);
      const port = portMatch ? portMatch[1] : '3000';
      return {
        problemDetected: `Port ${port} is already in use by another process`,
        shortExplanation: `Another running application or background server is currently occupying port ${port}.`,
        whyThisHappened: `Operating systems do not permit two processes to bind to the exact same TCP port simultaneously.`,
        whatToDo: [
          `Find the process ID currently bound to port ${port}.`,
          `Terminate the offending process or run your new application on an alternate port.`,
        ],
        commands: [
          {
            command: process.platform === 'win32'
              ? `netstat -ano | findstr :${port}`
              : `lsof -i :${port}`,
            description: `List process ID holding port ${port}`,
          },
          {
            command: process.platform === 'win32'
              ? `taskkill /PID <PID_FROM_ABOVE> /F`
              : `npx kill-port ${port}`,
            description: `Terminate process occupying port ${port}`,
            safetyNote: 'Ensure the process is not an essential system service before killing.',
          },
        ],
        thingsToAvoid: ['Do not reboot your whole PC just to clear a port.', 'Avoid randomly changing system network settings.'],
        confidence: 'HIGH',
        errorType: 'Network / Port Binding',
        isActionable: true,
      };
    }

    if (lower.includes('module_not_found') || lower.includes('cannot find module')) {
      const modMatch = text.match(/cannot find module ['"]([^'"]+)['"]/i) || text.match(/module_not_found:?\s*['"]?([a-zA-Z0-9@/._-]+)/i);
      const modName = modMatch ? modMatch[1] : 'the required package';
      return {
        problemDetected: `Missing module dependency: ${modName}`,
        shortExplanation: `Your project tried to import '${modName}', but it is not installed in node_modules.`,
        whyThisHappened: `The package was added to the code but not yet installed via npm, or node_modules was deleted.`,
        whatToDo: [
          `Install the missing package using your package manager.`,
          `Verify that the import path spelling matches the actual package name.`,
        ],
        commands: [
          {
            command: `npm install ${modName}`,
            description: `Install the missing package into project dependencies`,
          },
        ],
        thingsToAvoid: ['Do not edit files inside node_modules directly.', 'Do not use --force unless necessary.'],
        confidence: 'HIGH',
        errorType: 'Node.js / Dependency Missing',
        isActionable: true,
      };
    }

    if (lower.includes('enoent') || lower.includes('no such file or directory')) {
      return {
        problemDetected: 'File or directory not found (ENOENT)',
        shortExplanation: 'The application attempted to open or write to a path that does not exist.',
        whyThisHappened: 'A file was moved, renamed, or the working directory of the script does not match expectations.',
        whatToDo: [
          'Verify that the targeted file or directory actually exists on disk.',
          'Check for typographical errors in file paths or relative path resolution.',
        ],
        commands: [
          {
            command: 'ls -la',
            description: 'Inspect files in the current working directory',
          },
        ],
        thingsToAvoid: ['Do not hardcode absolute paths that will break on another machine.'],
        confidence: 'MEDIUM',
        errorType: 'Filesystem / Path Error',
        isActionable: true,
      };
    }

    if (lower.includes('traceback') && (lower.includes('filenotfounderror') || lower.includes('importerror'))) {
      return {
        problemDetected: 'Python Runtime Exception',
        shortExplanation: 'A Python script terminated with an unhandled exception.',
        whyThisHappened: 'A referenced module or file could not be imported during script execution.',
        whatToDo: [
          'Ensure your Python virtual environment is activated.',
          'Install dependencies from requirements.txt.',
        ],
        commands: [
          {
            command: 'pip install -r requirements.txt',
            description: 'Install all missing Python requirements',
          },
        ],
        thingsToAvoid: ['Do not mix global system Python packages with virtual environments.'],
        confidence: 'HIGH',
        errorType: 'Python Execution Error',
        isActionable: true,
      };
    }

    // Generic Error extraction
    const firstLines = text.split('\n').filter((l) => l.trim().length > 0).slice(0, 3).join(' ');
    return {
      problemDetected: firstLines.substring(0, 80) || 'Software / Execution Issue Detected',
      shortExplanation: 'An error or unexpected status code was captured in the input.',
      whyThisHappened: 'System reported an unhandled exception or failed status code.',
      whatToDo: [
        'Review the logs or terminal output directly preceding this failure.',
        'Check network connectivity and recent configuration changes.',
      ],
      commands: [],
      thingsToAvoid: ['Do not perform destructive system resets before isolating the error.'],
      confidence: 'LOW',
      errorType: 'General Error',
      isActionable: false,
    };
  }

  /**
   * Scam Check Fallback
   */
  static analyzeScam(rawText: string): ScamCheckResult {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    let score = 10;
    const indicators: string[] = [];
    const suspiciousElements: ScamCheckResult['suspiciousElements'] = [];

    // Check for urgency
    if (/(urgent|immediately|within 24 hours|account suspended|deactivated|action required)/i.test(text)) {
      score += 25;
      indicators.push('Uses artificial urgency or threats of account suspension.');
      suspiciousElements.push({
        type: 'urgency',
        text: 'Urgent deadline detected',
        note: 'Scammers create panic so victims act without thinking.',
      });
    }

    // Check for OTP / Password / PIN requests
    if (/(otp|one time password|pin|password|cvv|upi pin|bank credentials)/i.test(text)) {
      score += 35;
      indicators.push('Explicitly mentions or requests sensitive authentication secrets (OTP, PIN, Password).');
      suspiciousElements.push({
        type: 'otp',
        text: 'Authentication credentials mentioned',
        note: 'Legitimate institutions NEVER ask for your OTP or PIN over chat/SMS.',
      });
    }

    // Check for financial lure / lottery / job scam
    if (/(lottery|prize|won|reward|daily income|work from home.*earn|crypto.*double|free gift)/i.test(text)) {
      score += 30;
      indicators.push('Promises unrealistic financial rewards or lottery winnings.');
      suspiciousElements.push({
        type: 'money',
        text: 'Unrealistic financial promise',
        note: 'Legitimate jobs or lotteries do not ask for advance payment or offer free money.',
      });
    }

    // Check for suspicious URLs
    const urlRegex = /(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+|[a-zA-Z0-9.-]+\.xyz|[a-zA-Z0-9.-]+\.top)/gi;
    const urlMatches = text.match(urlRegex);
    if (urlMatches && urlMatches.length > 0) {
      score += 20;
      indicators.push(`Contains external link: ${urlMatches[0]}`);
      suspiciousElements.push({
        type: 'url',
        text: urlMatches[0],
        note: 'Unverified links may point to credential phishing or malware pages.',
      });
    }

    // Check for impersonation
    if (/(sbi|hdfc|icici|paytm|electricity department|income tax|customs|police)/i.test(text)) {
      if (score > 30) {
        indicators.push('Appears to impersonate an official bank, authority, or utility provider.');
        suspiciousElements.push({
          type: 'impersonation',
          text: 'Official entity name referenced',
          note: 'Scammers frequently spoof well-known banks or utility boards.',
        });
      }
    }

    const finalScore = Math.min(100, score);
    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      finalScore >= 60 ? 'HIGH' : finalScore >= 35 ? 'MEDIUM' : 'LOW';

    return {
      riskLevel,
      riskScore: finalScore,
      riskIndicators: indicators.length > 0 ? indicators : ['No obvious high-risk social engineering keywords detected.'],
      whyThisIsSuspicious:
        riskLevel === 'HIGH'
          ? 'This message displays classic signs of fraudulent social engineering designed to steal money or credentials.'
          : riskLevel === 'MEDIUM'
          ? 'This message contains elements that require careful verification before taking any action.'
          : 'The text appears mostly informational, but always exercise standard online caution.',
      whatNotToDo: [
        'Do NOT share your OTP, UPI PIN, or banking passwords with anyone.',
        'Do NOT click unverified links or install APKs sent via chat or SMS.',
        'Do NOT send money to claim prizes or lottery rewards.',
      ],
      whatYouShouldDo: [
        'Check your official banking or utility app independently.',
        'Block and report the sender if unsolicited.',
        'Verify with customer support through known official helpline numbers.',
      ],
      safeNextSteps: [
        'Close this message and open your official provider app directly.',
        'Report phishing to cybercrime portals if financial fraud was attempted.',
      ],
      suspiciousElements,
      confidence: indicators.length > 1 ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Bill Explainer Fallback
   */
  static analyzeBill(rawText: string): BillAnalysisResult {
    const text = rawText.trim();

    // Amount extraction: ₹1,234.50 or Rs. 1234 or $123.45
    const amountRegex = /(?:total|amount payable|net payable|balance due|due amount|total amount)[\s:₹$Rs.]*([0-9,]+(?:\.[0-9]{2})?)/i;
    const amountMatch = text.match(amountRegex);
    let totalAmount: number | null = null;
    if (amountMatch && amountMatch[1]) {
      const cleanNum = amountMatch[1].replace(/,/g, '');
      totalAmount = parseFloat(cleanNum);
    }

    // Due Date extraction
    const dateRegex = /(?:due date|pay by|due on)[\s:]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})/i;
    const dateMatch = text.match(dateRegex);
    const dueDate = dateMatch ? dateMatch[1] : null;

    // Currency detection
    const currency = text.includes('$') ? '$' : text.includes('€') ? '€' : '₹';

    // Basic line item extraction
    const lines = text.split('\n');
    const breakdown: BillAnalysisResult['chargeBreakdown'] = [];
    const unusualCharges: string[] = [];

    for (const line of lines) {
      const itemMatch = line.match(/^([^0-9\n]{3,35})\s+[\s₹$Rs.]*([0-9,]+(?:\.[0-9]{2})?)$/);
      if (itemMatch) {
        const item = itemMatch[1].trim();
        const amt = parseFloat(itemMatch[2].replace(/,/g, ''));
        if (!isNaN(amt) && amt > 0 && amt !== totalAmount) {
          const isLate = /late|penalty|surcharge|interest/i.test(item);
          if (isLate) {
            unusualCharges.push(`${item}: ${currency}${amt}`);
          }
          breakdown.push({
            item,
            amount: amt,
            isUnusual: isLate,
            note: isLate ? 'Surcharge or fee detected' : undefined,
          });
        }
      }
    }

    return {
      totalAmount,
      currency,
      dueDate,
      billingPeriod: null,
      billerName: 'Service Provider / Utility Authority',
      whyYouArePayingThis: totalAmount
        ? `This statement requests payment of ${currency}${totalAmount} for services rendered.`
        : 'This document appears to be a bill or invoice statement.',
      chargeBreakdown: breakdown.length > 0 ? breakdown : [
        {
          item: 'Total Charges',
          amount: totalAmount || 0,
          isUnusual: false,
        },
      ],
      unusualCharges,
      changesFromPreviousBill: null,
      importantDates: dueDate ? [{ label: 'Due Date', date: dueDate }] : [],
      thingsToCheck: [
        'Verify that your billing period matches your actual service consumption.',
        'Pay on or before the due date to avoid recurring late payment surcharges.',
      ],
      confidence: totalAmount ? 'MEDIUM' : 'LOW',
    };
  }

  /**
   * Subscription Finder Fallback
   */
  static analyzeSubscriptions(rawText: string): SubscriptionAnalysisResult {
    const text = rawText.trim();
    const detected: DetectedSubscription[] = [];

    const commonServices = [
      { name: 'Netflix', regex: /netflix/i, category: 'Entertainment', estCost: 649 },
      { name: 'Spotify', regex: /spotify/i, category: 'Music', estCost: 119 },
      { name: 'Amazon Prime', regex: /prime|amazon\s*prime/i, category: 'Shopping & Media', estCost: 299 },
      { name: 'Disney+ Hotstar', regex: /hotstar|disney/i, category: 'Entertainment', estCost: 299 },
      { name: 'YouTube Premium', regex: /youtube|google.*youtube/i, category: 'Entertainment', estCost: 149 },
      { name: 'Apple Services', regex: /apple\.com|itunes/i, category: 'Cloud / Media', estCost: 199 },
      { name: 'Google One', regex: /google\s*one/i, category: 'Cloud Storage', estCost: 130 },
      { name: 'GitHub Copilot', regex: /github/i, category: 'Developer Tools', estCost: 850 },
      { name: 'ChatGPT Plus', regex: /openai|chatgpt/i, category: 'AI Tools', estCost: 1999 },
      { name: 'Cult.fit Gym', regex: /cult\.fit|curefit/i, category: 'Health & Fitness', estCost: 1500 },
      { name: 'Broadband / Wi-Fi', regex: /jiofiber|airtel.*xstream|act\s*corp/i, category: 'Utilities', estCost: 999 },
    ];

    for (const s of commonServices) {
      if (s.regex.test(text)) {
        // Try finding adjacent amount
        const pattern = new RegExp(`${s.name}[^0-9]*([0-9,]+(?:\\.[0-9]{2})?)`, 'i');
        const match = text.match(pattern);
        const amount = match ? parseFloat(match[1].replace(/,/g, '')) : s.estCost;

        detected.push({
          merchant: s.name,
          amount,
          currency: '₹',
          frequency: 'monthly',
          estimatedYearlyCost: amount * 12,
          occurrenceCount: 1,
          confidence: 'HIGH',
          category: s.category,
          actionRecommendation: 'Review if you still use this subscription regularly',
        });
      }
    }

    const totalMonthly = detected.reduce((sum, d) => sum + d.amount, 0);
    const totalYearly = totalMonthly * 12;

    return {
      detectedSubscriptions: detected,
      totalMonthlySpend: totalMonthly,
      totalYearlySpend: totalYearly,
      potentialSavings: totalYearly * 0.3, // e.g. estimated savings from cancelling unused
      summary: detected.length > 0
        ? `Found ${detected.length} recurring subscription services totaling ₹${totalMonthly.toFixed(2)}/month.`
        : 'No prominent recurring subscription services were automatically identified in the text.',
      detectedCount: detected.length,
    };
  }

  /**
   * Voice Note to To-Do Fallback
   */
  static analyzeVoiceTasks(rawText: string): VoiceTaskResult {
    const text = rawText.trim();
    if (!text) {
      return {
        summary: 'No voice content captured',
        rawTranscript: '',
        tasks: [],
        detectedPeople: [],
        detectedDates: [],
        confidence: 'LOW',
      };
    }

    // Split on coordinating conjunctions and punctuation
    const chunks = text
      .split(/(?:,\s*and\s*then|,?\s*and\s+|,?\s*also\s+|\.\s+|\n+)/gi)
      .map((c) => c.trim())
      .filter((c) => c.length > 3);

    const tasks: VoiceTaskResult['tasks'] = [];
    const detectedPeople: string[] = [];
    const detectedDates: string[] = [];

    // Check for common date mentions
    const dateMatch = text.match(/\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/i);
    const commonDate = dateMatch ? dateMatch[1].toLowerCase() : undefined;
    if (commonDate) detectedDates.push(commonDate);

    // Check for time mentions
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*o'clock)\b/i);
    const commonTime = timeMatch ? timeMatch[1] : undefined;

    for (const chunk of chunks) {
      // Check for person mention like "call Rahul", "email Priya"
      const personMatch = chunk.match(/\b(?:call|email|send|meet|tell|ask)\s+([A-Z][a-z]+)\b/);
      let person: string | undefined;
      if (personMatch && !['The', 'A', 'My', 'Our'].includes(personMatch[1])) {
        person = personMatch[1];
        if (!detectedPeople.includes(person)) {
          detectedPeople.push(person);
        }
      }

      const isHighPriority = /urgent|important|asap|today/i.test(chunk);

      tasks.push({
        title: chunk.charAt(0).toUpperCase() + chunk.slice(1),
        dueDate: commonDate,
        time: commonTime,
        priority: isHighPriority ? 'HIGH' : 'MEDIUM',
        person,
        completed: false,
      });
    }

    return {
      summary: `Extracted ${tasks.length} actionable task${tasks.length === 1 ? '' : 's'} from voice note`,
      rawTranscript: text,
      tasks: tasks.length > 0 ? tasks : [
        {
          title: text,
          priority: 'MEDIUM',
          completed: false,
        },
      ],
      detectedPeople,
      detectedDates,
      confidence: tasks.length > 0 ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Product / Buy Advisor Fallback
   */
  static analyzeProduct(rawText: string): ProductAnalysisResult {
    const text = rawText.trim();
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const cleanedLines = lines.filter((l) => {
      const lower = l.trim().toLowerCase();
      return (
        !lower.startsWith('document / extracted text') &&
        !lower.startsWith('user question') &&
        !lower.startsWith('product listing') &&
        l.trim().length > 2
      );
    });
    const rawName = cleanedLines[0] ? cleanedLines[0].substring(0, 60).replace(/^[#*->:\s]+/, '').trim() : 'Inspected Product';
    const productName = rawName || 'Inspected Product';

    // Price extraction
    const priceMatch = text.match(/(?:₹|Rs\.?|\$)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    const price = priceMatch ? priceMatch[0] : null;

    return {
      productName,
      price,
      quickVerdict: 'Verify specifications and warranty before finalizing this purchase.',
      goodFor: ['General everyday usage according to standard specifications'],
      notIdealFor: ['High-stress or specialized commercial workloads unless confirmed'],
      pros: ['Standard feature set detected in the specification list'],
      cons: ['Check warranty duration and return policy limitations'],
      importantSpecifications: [
        { label: 'Identified Name', value: productName },
        { label: 'Detected Price', value: price || 'Not visible in the provided image' },
      ],
      potentialConcerns: [
        'Review return and exchange window on the retailer site.',
        'Confirm warranty coverage with manufacturer.',
      ],
      questionsToAskBeforeBuying: [
        'Does it include all necessary cables and accessories in the box?',
        'Is local after-sales service and repair available in your city?',
      ],
      valueAssessment: price ? `Assessed at ${price}. Compare with competing brands.` : 'Value depends on final retailer discount.',
      confidence: 'MEDIUM',
    };
  }

  /**
   * General Help Fallback
   */
  static analyzeGeneral(rawText: string): GeneralHelpResult {
    const text = rawText.trim();
    return {
      summary: 'Practical guidance for your request',
      explanation: text ? `FixMate analyzed your input: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"` : 'FixMate is ready to assist you.',
      keyTakeaways: [
        'Information captured successfully in local privacy mode.',
        'Review the key points and take corresponding next steps.',
      ],
      recommendedActions: [
        'Verify any external details with primary sources.',
        'Save or export this record to your local history.',
      ],
      suggestedNextStep: 'Take immediate action on the primary requirement above.',
      confidence: 'MEDIUM',
    };
  }
}

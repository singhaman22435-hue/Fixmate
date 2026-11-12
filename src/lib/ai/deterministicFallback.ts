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
   * Detects real warning indicators: suspicious links, urgency, payment requests,
   * OTP requests, impersonation, threats, and reward/prize claims.
   * Produces calibrated LOW/MEDIUM/HIGH risk with evidence and safe actions.
   */
  static analyzeScam(rawText: string): ScamCheckResult {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    let score = 5;
    const indicators: string[] = [];
    const suspiciousElements: ScamCheckResult['suspiciousElements'] = [];

    // 1. Check for urgency / coercion / threats
    if (/(urgent|immediately|within 24 hours|account suspended|deactivated|disconnected tonight|warrant|arrest|legal notice|action required|final warning|police complaint)/i.test(text)) {
      score += 25;
      indicators.push('Uses psychological urgency or intimidation threats (e.g. suspension, disconnection, legal action).');
      suspiciousElements.push({
        type: 'urgency',
        text: 'Urgent deadline / disconnection threat',
        note: 'Scammers create artificial panic to force quick emotional decisions without verification.',
      });
    }

    // 2. Check for OTP / Password / PIN / Banking Secrets requests
    if (/(otp|one time password|pin|password|cvv|upi pin|bank credentials|card details|net banking password)/i.test(text)) {
      score += 35;
      indicators.push('Explicitly requests authentication secrets (OTP, PIN, Password, CVV).');
      suspiciousElements.push({
        type: 'otp',
        text: 'Authentication secret requested',
        note: 'Legitimate institutions NEVER request your OTP or UPI PIN under any circumstance.',
      });
    }

    // 3. Check for payment demands / UPI transfer / Gift cards / Crypto
    if (/(send.*to upi|gpay to|phonepe to|paytm to|transfer money to|claim prize pay|processing fee|advance fee|gift card|bitcoin|crypto transfer)/i.test(text)) {
      score += 30;
      indicators.push('Instructs recipient to send funds via direct UPI transfer, gift card, or advance processing fee.');
      suspiciousElements.push({
        type: 'money',
        text: 'Direct payment / advance fee request',
        note: 'Legitimate lotteries, refunds, or employers never charge an upfront fee to release money.',
      });
    }

    // 4. Check for financial lure / lottery / work from home / fake prize
    if (/(lottery|prize|won.*crore|won.*lakh|congratulations.*winner|daily income|earn.*per day|work from home.*typing|crypto.*double|free gift.*claim)/i.test(text)) {
      score += 25;
      indicators.push('Promises unrealistic financial windfall, lottery winnings, or lucrative low-effort job offers.');
      suspiciousElements.push({
        type: 'money',
        text: 'Unrealistic financial promise or lottery',
        note: 'Classic advance-fee lure designed to extract personal information or fee payments.',
      });
    }

    // 5. Check for suspicious URLs, IP addresses, URL shorteners, deceptive domains
    const urlMatches = text.match(/(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+|is\.gd\/[^\s]+|t\.co\/[^\s]+|[a-zA-Z0-9.-]+\.(?:xyz|top|tk|club|work|click|live|loan|cam|pw))/gi);
    if (urlMatches && urlMatches.length > 0) {
      for (const matchedUrl of urlMatches.slice(0, 3)) {
        const isShortener = /(bit\.ly|tinyurl|is\.gd|t\.co|cutt\.ly|rb\.gy)/i.test(matchedUrl);
        const isIpUrl = /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(matchedUrl);
        const isSuspiciousTld = /\.(xyz|top|tk|club|work|click|live|loan|cam|pw)/i.test(matchedUrl);

        if (isShortener || isIpUrl || isSuspiciousTld) {
          score += 25;
          indicators.push(`Contains high-risk link: ${matchedUrl} (${isShortener ? 'masked shortener' : isIpUrl ? 'raw IP host' : 'suspicious domain TLD'})`);
          suspiciousElements.push({
            type: 'url',
            text: matchedUrl,
            note: 'Hidden destination or non-standard domain frequently utilized in phishing attack infrastructure.',
          });
        } else {
          score += 15;
          indicators.push(`Contains external link: ${matchedUrl}`);
          suspiciousElements.push({
            type: 'url',
            text: matchedUrl,
            note: 'Verify domain name letter-by-letter against the official company website before opening.',
          });
        }
      }
    }

    // 6. Check for institution / authority impersonation
    const impersonationPatterns = [
      { name: 'State Bank of India / YONO', regex: /(sbi|yono|state bank)/i },
      { name: 'HDFC / ICICI / Axis Bank', regex: /(hdfc|icici|axis bank)/i },
      { name: 'Electricity Department', regex: /(electricity.*bill|power.*cut|discom|bijli|bescom|tneb|mseb)/i },
      { name: 'Income Tax / GST Authority', regex: /(income tax|it department|refund.*tax|gst department)/i },
      { name: 'Police / Cyber Crime / Customs', regex: /(customs.*parcel|police.*station|cyber.*cell|fedex.*drugs)/i },
      { name: 'Telecom Provider (SIM KYC)', regex: /(sim.*blocked|jio.*kyc|airtel.*kyc|vi.*kyc)/i },
    ];

    for (const imp of impersonationPatterns) {
      if (imp.regex.test(text)) {
        if (score >= 25) {
          indicators.push(`Appears to claim authority or brand identity of ${imp.name}.`);
          suspiciousElements.push({
            type: 'impersonation',
            text: imp.name,
            note: 'Scammers frequently spoof utility providers, banks, or police to establish false credibility.',
          });
        }
      }
    }

    const finalScore = Math.min(100, Math.max(5, score));
    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      finalScore >= 60 ? 'HIGH' : finalScore >= 35 ? 'MEDIUM' : 'LOW';

    return {
      riskLevel,
      riskScore: finalScore,
      riskIndicators:
        indicators.length > 0 ? indicators : ['No recognized social engineering or phishing indicators detected.'],
      whyThisIsSuspicious:
        riskLevel === 'HIGH'
          ? 'This message demonstrates prominent indicators of social engineering, credential theft, or financial fraud.'
          : riskLevel === 'MEDIUM'
          ? 'This message exhibits cautionary characteristics (such as external links or urgency) that should be verified through trusted independent channels.'
          : 'Standard informational text with low risk profile, though caution is always recommended with unsolicited communications.',
      whatNotToDo: [
        'Do NOT disclose OTPs, UPI PINs, passwords, or bank account details to anyone.',
        'Do NOT click masked or unfamiliar links in unsolicited SMS or messages.',
        'Do NOT send money or processing fees to claim refunds, prizes, or job bonuses.',
        'Do NOT install APK files or remote assistance apps (AnyDesk, TeamViewer) at caller request.',
      ],
      whatYouShouldDo: [
        'Open your official provider app or website directly from your browser bookmark, not from this link.',
        'If an account problem is claimed, contact customer care via verified phone numbers on official bills.',
        'Block and report unsolicited fraudulent senders within your messaging app.',
      ],
      safeNextSteps: [
        'Verify your account status independently on the official portal.',
        'Report attempted financial fraud to the national cybercrime helpline or bank immediately.',
      ],
      suspiciousElements,
      confidence: indicators.length > 1 ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Bill Explainer Fallback
   * Deterministic extraction of biller, total amount, due date, line items,
   * taxes, and explanation of why the bill changed without guessing.
   */
  static analyzeBill(rawText: string): BillAnalysisResult {
    const text = rawText.trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. Currency detection
    const currency = text.includes('$') ? '$' : text.includes('€') ? '€' : text.includes('£') ? '£' : '₹';

    // 2. Total Amount Extraction (prioritized pattern matching)
    let totalAmount: number | null = null;
    const amountRegexes = [
      /(?:total amount payable|net payable|amount payable|total payable|total amount|balance due|total due|grand total)[\s:₹$Rs.INR]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /(?:total charges|total bill|bill amount|final amount)[\s:₹$Rs.INR]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /(?:total|payable)[\s:₹$Rs.INR]*([0-9,]+(?:\.[0-9]{2})?)/i,
    ];

    for (const rgx of amountRegexes) {
      const match = text.match(rgx);
      if (match && match[1]) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          totalAmount = parsed;
          break;
        }
      }
    }

    // 3. Due Date extraction
    const dueDateRegexes = [
      /(?:due date|pay by|payment due date|last date|due on)[\s:]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4})/i,
    ];
    let dueDate: string | null = null;
    for (const rgx of dueDateRegexes) {
      const match = text.match(rgx);
      if (match && match[1]) {
        dueDate = match[1].trim();
        break;
      }
    }

    // 4. Billing Period extraction
    const periodRegex = /(?:billing period|bill period|cycle|period)[\s:]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}\s*(?:to|-)\s*[0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Za-z]{3,9}\s+[0-9]{4})/i;
    const periodMatch = text.match(periodRegex);
    const billingPeriod = periodMatch ? periodMatch[1].trim() : null;

    // 5. Biller / Provider identification
    let billerName: string | null = null;
    const knownProviders = [
      { name: 'BESCOM Electricity', regex: /bescom/i },
      { name: 'Tata Power', regex: /tata\s*power/i },
      { name: 'Torrent Power', regex: /torrent\s*power/i },
      { name: 'Adani Electricity', regex: /adani\s*electricity/i },
      { name: 'Airtel Broadband / Telecom', regex: /airtel/i },
      { name: 'Jio Fiber / Telecom', regex: /jio\s*(?:fiber|telecom|infocomm)?/i },
      { name: 'Vodafone Idea', regex: /(vodafone|vi\b)/i },
      { name: 'Mahanagar Gas (MGL)', regex: /(mahanagar\s*gas|mgl)/i },
      { name: 'Indraprastha Gas (IGL)', regex: /(indraprastha\s*gas|igl)/i },
      { name: 'HDFC Bank Credit Card', regex: /hdfc\s*bank/i },
      { name: 'SBI Cards', regex: /sbi\s*card/i },
      { name: 'ICICI Bank', regex: /icici\s*bank/i },
    ];

    for (const p of knownProviders) {
      if (p.regex.test(text)) {
        billerName = p.name;
        break;
      }
    }

    if (!billerName && lines.length > 0) {
      // Use clean top header line if it looks like a merchant name
      const candidate = lines[0].replace(/[#*_-]/g, '').trim();
      if (candidate.length > 2 && candidate.length < 50 && !candidate.toLowerCase().includes('document')) {
        billerName = candidate;
      }
    }

    // 6. Charge Breakdown & Line Items
    const breakdown: BillAnalysisResult['chargeBreakdown'] = [];
    const unusualCharges: string[] = [];
    let detectedLateFee: number | null = null;
    let detectedUnits: string | null = null;

    // Check for meter / consumption units
    const unitsMatch = text.match(/(?:units consumed|total units|consumption|kwh)[\s:]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (unitsMatch) {
      detectedUnits = `${unitsMatch[1]} units (kWh)`;
    }

    for (const line of lines) {
      // Match "Line Item Description ... 1,234.50"
      const itemMatch = line.match(/^([^0-9\n:]{3,40})[\s:.₹$Rs.INR]+([0-9,]+(?:\.[0-9]{2})?)$/);
      if (itemMatch) {
        const item = itemMatch[1].trim();
        const amt = parseFloat(itemMatch[2].replace(/,/g, ''));
        if (!isNaN(amt) && amt > 0 && amt !== totalAmount) {
          const isLate = /late\s*payment|penalty|surcharge|interest|fine|overdue/i.test(item);
          const isTax = /gst|cgst|sgst|tax|vat/i.test(item);

          if (isLate) {
            detectedLateFee = amt;
            unusualCharges.push(`${item}: ${currency}${amt}`);
          }

          breakdown.push({
            item,
            amount: amt,
            isUnusual: isLate,
            note: isLate ? 'Late payment penalty or surcharge' : isTax ? 'Government tax component' : undefined,
          });
        }
      }
    }

    // 7. Explaining why the bill changed
    let whyPaying = totalAmount
      ? `This statement requests payment of ${currency}${totalAmount}${billerName ? ` for ${billerName}` : ''}.`
      : 'This statement details utility or service charges for the billing cycle.';

    const changeExplanations: string[] = [];
    if (detectedUnits) {
      changeExplanations.push(`Electricity/service consumption recorded: ${detectedUnits}.`);
    }
    if (detectedLateFee) {
      changeExplanations.push(`Includes ${currency}${detectedLateFee} in late payment fees or interest from past cycles.`);
    }
    if (unusualCharges.length > 0) {
      changeExplanations.push(`Surcharges or additional fees detected: ${unusualCharges.join(', ')}.`);
    }

    const changesFromPrevious =
      changeExplanations.length > 0
        ? changeExplanations.join(' ')
        : 'Single billing cycle parsed. To identify usage spikes or rate hikes, compare against your previous statement.';

    return {
      totalAmount,
      currency,
      dueDate,
      billingPeriod,
      billerName: billerName || 'Service Provider / Utility Authority',
      whyYouArePayingThis: whyPaying,
      chargeBreakdown:
        breakdown.length > 0
          ? breakdown
          : totalAmount
          ? [{ item: 'Total Charges', amount: totalAmount, isUnusual: false }]
          : [],
      unusualCharges,
      changesFromPreviousBill: changesFromPrevious,
      importantDates: dueDate ? [{ label: 'Due Date', date: dueDate }] : [],
      thingsToCheck: [
        'Verify your meter reading or service usage tier against the stated consumption.',
        'Review line items for recurring surcharges, fuel adjustment charges, or delayed payment fees.',
        'Pay on or before the due date to avoid interest penalties.',
      ],
      confidence: totalAmount ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Subscription Finder Fallback
   * Audits statements / CSVs for recurring subscriptions with accurate math,
   * frequency detection, and never fabricates missing amounts.
   */
  static analyzeSubscriptions(rawText: string): SubscriptionAnalysisResult {
    const text = rawText.trim();
    const detected: DetectedSubscription[] = [];

    const commonServices = [
      { name: 'Netflix', regex: /netflix/i, category: 'Entertainment' },
      { name: 'Spotify', regex: /spotify/i, category: 'Music Streaming' },
      { name: 'Amazon Prime', regex: /prime|amazon\s*prime/i, category: 'Shopping & Media' },
      { name: 'Disney+ Hotstar', regex: /hotstar|disney/i, category: 'Entertainment' },
      { name: 'YouTube Premium', regex: /youtube\s*(?:premium|membership)?/i, category: 'Entertainment' },
      { name: 'Apple Services', regex: /apple\.com|itunes|icloud/i, category: 'Cloud Storage & Apps' },
      { name: 'Google One', regex: /google\s*one/i, category: 'Cloud Storage' },
      { name: 'GitHub Copilot', regex: /github/i, category: 'Developer Tools' },
      { name: 'ChatGPT Plus', regex: /openai|chatgpt/i, category: 'AI Tools' },
      { name: 'Cult.fit', regex: /cult\.fit|curefit/i, category: 'Health & Fitness' },
      { name: 'Broadband / Wi-Fi', regex: /jiofiber|airtel.*xstream|act\s*corp/i, category: 'Utilities' },
      { name: 'Zomato Gold', regex: /zomato\s*gold/i, category: 'Dining & Delivery' },
      { name: 'Swiggy One', regex: /swiggy\s*one/i, category: 'Dining & Delivery' },
      { name: 'Times Prime', regex: /times\s*prime/i, category: 'Memberships' },
    ];

    for (const s of commonServices) {
      if (s.regex.test(text)) {
        // Try finding adjacent amount explicitly
        const pattern = new RegExp(`${s.name}[^0-9\n]{0,30}[₹$Rs.INR\s]*([0-9,]+(?:\\.[0-9]{2})?)`, 'i');
        const match = text.match(pattern);

        if (match && match[1]) {
          const parsedAmt = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(parsedAmt) && parsedAmt > 0) {
            // Check frequency
            const freqPattern = new RegExp(`${s.name}[^\n]{0,50}(yearly|annual|quarterly|weekly|monthly)`, 'i');
            const freqMatch = text.match(freqPattern);
            const rawFreq = freqMatch ? freqMatch[1].toLowerCase() : 'monthly';
            const frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly' =
              rawFreq.includes('year') || rawFreq.includes('annual')
                ? 'yearly'
                : rawFreq.includes('quarter')
                ? 'quarterly'
                : rawFreq.includes('week')
                ? 'weekly'
                : 'monthly';

            // Accurate cost projection: NO guessing
            let yearlyCost = parsedAmt * 12;
            if (frequency === 'yearly') yearlyCost = parsedAmt;
            else if (frequency === 'quarterly') yearlyCost = parsedAmt * 4;
            else if (frequency === 'weekly') yearlyCost = parsedAmt * 52;

            detected.push({
              merchant: s.name,
              amount: parsedAmt,
              currency: text.includes('$') ? '$' : '₹',
              frequency,
              estimatedYearlyCost: yearlyCost,
              occurrenceCount: 1,
              confidence: 'HIGH',
              category: s.category,
              actionRecommendation: 'Review if you actively use this service',
            });
          }
        }
      }
    }

    const totalMonthly = detected.reduce((sum, d) => {
      if (d.frequency === 'monthly') return sum + d.amount;
      if (d.frequency === 'yearly') return sum + d.amount / 12;
      if (d.frequency === 'quarterly') return sum + (d.amount * 4) / 12;
      if (d.frequency === 'weekly') return sum + (d.amount * 52) / 12;
      return sum + d.amount;
    }, 0);

    const totalYearly = detected.reduce((sum, d) => sum + d.estimatedYearlyCost, 0);

    return {
      detectedSubscriptions: detected,
      totalMonthlySpend: Math.round(totalMonthly * 100) / 100,
      totalYearlySpend: Math.round(totalYearly * 100) / 100,
      potentialSavings: detected.length > 0 ? Math.round(totalYearly * 0.25 * 100) / 100 : 0,
      summary:
        detected.length > 0
          ? `Identified ${detected.length} recurring subscription${detected.length === 1 ? '' : 's'} totaling approximately ₹${Math.round(totalMonthly)}/month.`
          : 'No recurring subscriptions with recognizable amounts were detected in this document or statement.',
      detectedCount: detected.length,
    };
  }

  /**
   * Voice Note to To-Do Fallback
   * Extracts actionable tasks without inventing dates or unmentioned details.
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

    // Split on coordinating conjunctions, commas, periods, or newlines
    const chunks = text
      .split(/(?:,\s*and\s*then|,?\s*and\s+|,?\s*also\s+|\.\s+|\n+)/gi)
      .map((c) => c.trim())
      .filter((c) => c.length > 3);

    const tasks: VoiceTaskResult['tasks'] = [];
    const detectedPeople: string[] = [];
    const detectedDates: string[] = [];

    // Check for explicit date mentions in text
    const dateMatch = text.match(/\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/i);
    const commonDate = dateMatch ? dateMatch[1].toLowerCase() : undefined;
    if (commonDate) detectedDates.push(commonDate);

    // Check for explicit time mentions in text
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*o'clock)\b/i);
    const commonTime = timeMatch ? timeMatch[1] : undefined;

    for (const chunk of chunks) {
      // Check for person mention like "call Rahul", "email Priya"
      const personMatch = chunk.match(/\b(?:call|email|send|meet|tell|ask)\s+([A-Z][a-z]+)\b/);
      let person: string | undefined;
      if (personMatch && !['The', 'A', 'My', 'Our', 'Please'].includes(personMatch[1])) {
        person = personMatch[1];
        if (!detectedPeople.includes(person)) {
          detectedPeople.push(person);
        }
      }

      const isHighPriority = /urgent|important|asap|today|immediately/i.test(chunk);

      // Clean task title
      const cleanTitle = chunk
        .replace(/^(remember to|need to|have to|please|make sure to)\s+/i, '')
        .trim();

      if (cleanTitle.length > 2) {
        tasks.push({
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          dueDate: commonDate,
          time: commonTime,
          priority: isHighPriority ? 'HIGH' : 'MEDIUM',
          person,
          completed: false,
        });
      }
    }

    return {
      summary: `Extracted ${tasks.length} task${tasks.length === 1 ? '' : 's'} ready for your confirmation`,
      rawTranscript: text,
      tasks:
        tasks.length > 0
          ? tasks
          : [
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
   * Only uses specifications actually extracted or supplied by user.
   * Never fabricates prices, specifications, or reviews.
   */
  static analyzeProduct(rawText: string): ProductAnalysisResult {
    const text = rawText.trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Filter out prompt scaffolding
    const cleanedLines = lines.filter((l) => {
      const lower = l.toLowerCase();
      return (
        !lower.startsWith('document / extracted text') &&
        !lower.startsWith('user question') &&
        !lower.startsWith('product listing') &&
        l.length > 2
      );
    });

    const rawName = cleanedLines[0]
      ? cleanedLines[0].substring(0, 60).replace(/^[#*->:\s]+/, '').trim()
      : 'Inspected Product';
    const productName = rawName || 'Inspected Product';

    // Price extraction: look for ₹, Rs., or $ followed by numbers
    const priceMatch = text.match(/(?:₹|Rs\.?|\$)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    const price = priceMatch ? priceMatch[0] : null;

    // Extract actual specifications lines (e.g. "RAM: 8GB", "Storage - 256GB")
    const extractedSpecs: Array<{ label: string; value: string }> = [];
    const specKeywords = [
      'ram', 'storage', 'processor', 'cpu', 'battery', 'display', 'screen',
      'camera', 'os', 'weight', 'warranty', 'connectivity', 'resolution',
      'color', 'dimensions', 'model'
    ];

    for (const line of cleanedLines) {
      const match = line.match(/^([A-Za-z\s]{3,20})[:\-]\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        const isSpec = specKeywords.some((k) => key.toLowerCase().includes(k));
        if (isSpec && val.length > 0 && val.length < 80) {
          extractedSpecs.push({ label: key, value: val });
        }
      }
    }

    if (price) {
      extractedSpecs.unshift({ label: 'Identified Price', value: price });
    }

    const hasSpecs = extractedSpecs.length > 0;

    return {
      productName,
      price,
      quickVerdict: hasSpecs
        ? `Specifications identified for ${productName}. Review warranty and return terms before finalizing.`
        : 'Product detected. Detailed technical specifications were not visible in the provided text/image.',
      goodFor: hasSpecs
        ? ['Use cases matching the verified specifications above']
        : ['General evaluation based on retailer listing'],
      notIdealFor: [
        'Heavy specialized usage unless confirmed by manufacturer specifications',
      ],
      pros: hasSpecs
        ? extractedSpecs.slice(0, 3).map((s) => `${s.label}: ${s.value}`)
        : ['Listing detected for evaluation'],
      cons: [
        'Check retailer return window and warranty coverage limitations.',
      ],
      importantSpecifications:
        extractedSpecs.length > 0
          ? extractedSpecs
          : [
              {
                label: 'Status',
                value: 'No technical specifications found in the uploaded text or image.',
              },
            ],
      potentialConcerns: [
        'Verify warranty terms and local service center availability.',
        'Check return and replacement window before buying.',
      ],
      questionsToAskBeforeBuying: [
        'What accessories and cables are included in the box?',
        'Is the warranty handled by the seller or the official brand service center?',
        'What is the return window if the unit arrives damaged?',
      ],
      valueAssessment: price
        ? `Listed at ${price}. Compare against competing models in this price tier.`
        : 'Price was not visible in the text/image. Check final retailer price.',
      confidence: hasSpecs ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * General Help Fallback
   */
  static analyzeGeneral(rawText: string): GeneralHelpResult {
    const text = rawText.trim();
    return {
      summary: 'Practical guidance for your request',
      explanation: text
        ? `FixMate analyzed your input: "${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`
        : 'FixMate is ready to assist you.',
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

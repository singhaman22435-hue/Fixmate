export type FixMateIntent =
  | 'TECHNICAL_ERROR'
  | 'BILL_EXPLANATION'
  | 'SUBSCRIPTION_ANALYSIS'
  | 'PRODUCT_ANALYSIS'
  | 'SCAM_ANALYSIS'
  | 'VOICE_TASK_EXTRACTION'
  | 'GENERAL_QUESTION'
  | 'DOCUMENT_EXPLANATION';

export type FixMateInputType = 'image' | 'pdf' | 'audio' | 'text' | 'csv';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IntentDetectionResult {
  intent: FixMateIntent;
  confidence: number;
  reason: string;
  requiresVision: boolean;
  requiresOCR: boolean;
  detectedKeywords?: string[];
}

export interface ScreenshotFixResult {
  problemDetected: string;
  shortExplanation: string;
  whyThisHappened: string;
  whatToDo: string[];
  commands: Array<{
    command: string;
    description: string;
    safetyNote?: string;
  }>;
  thingsToAvoid: string[];
  confidence: ConfidenceLevel;
  errorType: string;
  isActionable: boolean;
}

export interface BillChargeItem {
  item: string;
  amount: number;
  isUnusual?: boolean;
  note?: string;
}

export interface BillAnalysisResult {
  totalAmount: number | null;
  currency: string;
  dueDate: string | null;
  billingPeriod: string | null;
  billerName: string | null;
  whyYouArePayingThis: string;
  chargeBreakdown: BillChargeItem[];
  unusualCharges: string[];
  changesFromPreviousBill: string | null;
  importantDates: Array<{ label: string; date: string }>;
  thingsToCheck: string[];
  confidence: ConfidenceLevel;
}

export interface DetectedSubscription {
  merchant: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  estimatedYearlyCost: number;
  occurrenceCount: number;
  confidence: ConfidenceLevel;
  lastDetectedDate?: string;
  category?: string;
  actionRecommendation?: string;
}

export interface SubscriptionAnalysisResult {
  detectedSubscriptions: DetectedSubscription[];
  totalMonthlySpend: number;
  totalYearlySpend: number;
  potentialSavings: number;
  summary: string;
  detectedCount: number;
}

export interface ProductAnalysisResult {
  productName: string;
  price: string | null;
  quickVerdict: string;
  goodFor: string[];
  notIdealFor: string[];
  pros: string[];
  cons: string[];
  importantSpecifications: Array<{ label: string; value: string }>;
  potentialConcerns: string[];
  questionsToAskBeforeBuying: string[];
  valueAssessment: string;
  confidence: ConfidenceLevel;
}

export interface ScamCheckResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number; // 0 - 100
  riskIndicators: string[];
  whyThisIsSuspicious: string;
  whatNotToDo: string[];
  whatYouShouldDo: string[];
  safeNextSteps: string[];
  suspiciousElements: Array<{
    type: 'url' | 'urgency' | 'money' | 'otp' | 'impersonation';
    text: string;
    note: string;
  }>;
  confidence: ConfidenceLevel;
}

export interface ExtractedTask {
  id?: string;
  title: string;
  dueDate?: string;
  time?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  person?: string;
  notes?: string;
  completed?: boolean;
}

export interface VoiceTaskResult {
  summary: string;
  rawTranscript: string;
  tasks: ExtractedTask[];
  detectedPeople: string[];
  detectedDates: string[];
  confidence: ConfidenceLevel;
}

export interface GeneralHelpResult {
  summary: string;
  explanation: string;
  keyTakeaways: string[];
  recommendedActions: string[];
  suggestedNextStep: string;
  confidence: ConfidenceLevel;
}

export type UnifiedAnalysisResultPayload =
  | { type: 'TECHNICAL_ERROR'; data: ScreenshotFixResult }
  | { type: 'BILL_EXPLANATION'; data: BillAnalysisResult }
  | { type: 'SUBSCRIPTION_ANALYSIS'; data: SubscriptionAnalysisResult }
  | { type: 'PRODUCT_ANALYSIS'; data: ProductAnalysisResult }
  | { type: 'SCAM_ANALYSIS'; data: ScamCheckResult }
  | { type: 'VOICE_TASK_EXTRACTION'; data: VoiceTaskResult }
  | { type: 'GENERAL_QUESTION' | 'DOCUMENT_EXPLANATION'; data: GeneralHelpResult };

export interface PipelineExecutionResult {
  analysisId?: string;
  intent: FixMateIntent;
  inputType: FixMateInputType;
  title: string;
  summary: string;
  confidence: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  extractedText: string;
  result: UnifiedAnalysisResultPayload;
  aiModelUsed: string;
  fallbackUsed: boolean;
  warnings?: string[];
}


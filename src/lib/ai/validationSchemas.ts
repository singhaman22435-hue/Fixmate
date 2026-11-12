import { z } from 'zod';

export const ConfidenceLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const ScreenshotFixResultSchema = z.object({
  problemDetected: z.string().default('System Issue Detected'),
  shortExplanation: z.string().default(''),
  whyThisHappened: z.string().default(''),
  whatToDo: z.array(z.string()).default([]),
  commands: z
    .array(
      z.object({
        command: z.string(),
        description: z.string(),
        safetyNote: z.string().optional(),
      })
    )
    .default([]),
  thingsToAvoid: z.array(z.string()).default([]),
  confidence: ConfidenceLevelSchema.default('MEDIUM'),
  errorType: z.string().default('General Error'),
  isActionable: z.boolean().default(true),
});

export const BillChargeItemSchema = z.object({
  item: z.string(),
  amount: z.number(),
  isUnusual: z.boolean().optional(),
  note: z.string().optional(),
});

export const BillAnalysisResultSchema = z.object({
  totalAmount: z.number().nullable().default(null),
  currency: z.string().default('₹'),
  dueDate: z.string().nullable().default(null),
  billingPeriod: z.string().nullable().default(null),
  billerName: z.string().nullable().default(null),
  whyYouArePayingThis: z.string().default('Statement analyzed.'),
  chargeBreakdown: z.array(BillChargeItemSchema).default([]),
  unusualCharges: z.array(z.string()).default([]),
  changesFromPreviousBill: z.string().nullable().default(null),
  importantDates: z
    .array(
      z.object({
        label: z.string(),
        date: z.string(),
      })
    )
    .default([]),
  thingsToCheck: z.array(z.string()).default([]),
  confidence: ConfidenceLevelSchema.default('MEDIUM'),
});

export const DetectedSubscriptionSchema = z.object({
  merchant: z.string(),
  amount: z.number(),
  currency: z.string().default('₹'),
  frequency: z.enum(['monthly', 'yearly', 'weekly', 'quarterly']).default('monthly'),
  estimatedYearlyCost: z.number(),
  occurrenceCount: z.number().default(1),
  confidence: ConfidenceLevelSchema.default('HIGH'),
  lastDetectedDate: z.string().optional(),
  category: z.string().optional(),
  actionRecommendation: z.string().optional(),
});

export const SubscriptionAnalysisResultSchema = z.object({
  detectedSubscriptions: z.array(DetectedSubscriptionSchema).default([]),
  totalMonthlySpend: z.number().default(0),
  totalYearlySpend: z.number().default(0),
  potentialSavings: z.number().default(0),
  summary: z.string().default(''),
  detectedCount: z.number().default(0),
});

export const ProductAnalysisResultSchema = z.object({
  productName: z.string().default('Inspected Product'),
  price: z.string().nullable().default(null),
  quickVerdict: z.string().default('Review specifications before purchase.'),
  goodFor: z.array(z.string()).default([]),
  notIdealFor: z.array(z.string()).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  importantSpecifications: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .default([]),
  potentialConcerns: z.array(z.string()).default([]),
  questionsToAskBeforeBuying: z.array(z.string()).default([]),
  valueAssessment: z.string().default(''),
  confidence: ConfidenceLevelSchema.default('MEDIUM'),
});

export const ScamCheckResultSchema = z.object({
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  riskScore: z.number().min(0).max(100).default(10),
  riskIndicators: z.array(z.string()).default([]),
  whyThisIsSuspicious: z.string().default(''),
  whatNotToDo: z.array(z.string()).default([]),
  whatYouShouldDo: z.array(z.string()).default([]),
  safeNextSteps: z.array(z.string()).default([]),
  suspiciousElements: z
    .array(
      z.object({
        type: z.enum(['url', 'urgency', 'money', 'otp', 'impersonation']),
        text: z.string(),
        note: z.string(),
      })
    )
    .default([]),
  confidence: ConfidenceLevelSchema.default('MEDIUM'),
});

export const ExtractedTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  dueDate: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  person: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  completed: z.boolean().default(false),
});

export const VoiceTaskResultSchema = z.object({
  summary: z.string().default(''),
  rawTranscript: z.string().default(''),
  tasks: z.array(ExtractedTaskSchema).default([]),
  detectedPeople: z.array(z.string()).default([]),
  detectedDates: z.array(z.string()).default([]),
  confidence: ConfidenceLevelSchema.default('MEDIUM'),
});

export const GeneralHelpResultSchema = z.object({
  summary: z.string().default(''),
  explanation: z.string().default(''),
  keyTakeaways: z.array(z.string()).default([]),
  recommendedActions: z.array(z.string()).default([]),
  suggestedNextStep: z.string().default(''),
  confidence: ConfidenceLevelSchema.default('MEDIUM'),
});


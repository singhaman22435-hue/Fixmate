'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedDropZone } from '@/components/input/UnifiedDropZone';
import { UnifiedResultRenderer } from '@/components/results/UnifiedResultRenderer';
import { PipelineExecutionResult } from '@/lib/analyzers/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Repeat,
  ShieldCheck,
  Trash2,
  Plus,
  Pencil,
  TrendingDown,
  Calendar,
  CreditCard,
  Search,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

interface SavedSubscription {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: string;
  estimatedYearlyCost: number;
  confidence: string;
  status: string;
  createdAt: string;
}

export default function SubscriptionsPage() {
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);
  const [savedSubs, setSavedSubs] = useState<SavedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SavedSubscription | null>(null);
  const [formData, setFormData] = useState({
    merchant: '',
    amount: '',
    currency: '₹',
    frequency: 'monthly',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSavedSubs(data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const openAddModal = () => {
    setEditingSub(null);
    setFormData({
      merchant: '',
      amount: '',
      currency: '₹',
      frequency: 'monthly',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sub: SavedSubscription) => {
    setEditingSub(sub);
    setFormData({
      merchant: sub.merchant,
      amount: sub.amount.toString(),
      currency: sub.currency,
      frequency: sub.frequency.toLowerCase(),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchant.trim()) {
      setFormError('Please enter a merchant or service name.');
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive subscription amount.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingSub) {
        const res = await fetch('/api/subscriptions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSub.id,
            merchant: formData.merchant,
            amount: numAmount,
            currency: formData.currency,
            frequency: formData.frequency,
          }),
        });
        if (!res.ok) throw new Error('Failed to update subscription');
      } else {
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant: formData.merchant,
            amount: numAmount,
            currency: formData.currency,
            frequency: formData.frequency,
          }),
        });
        if (!res.ok) throw new Error('Failed to create subscription');
      }

      setIsModalOpen(false);
      await fetchSubscriptions();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    try {
      await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setSavedSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
    } catch (e) {
      console.error('Failed to update subscription:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' });
      setSavedSubs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Failed to delete subscription:', e);
    }
  };

  // Calculations
  const activeSubs = savedSubs.filter((s) => s.status === 'ACTIVE');
  const totalAnnualCost = activeSubs.reduce((acc, s) => acc + s.estimatedYearlyCost, 0);
  const monthlyEquivalent = activeSubs.reduce((acc, s) => {
    const freq = s.frequency.toLowerCase();
    if (freq === 'yearly' || freq === 'annual') return acc + s.amount / 12;
    if (freq === 'quarterly') return acc + (s.amount * 4) / 12;
    if (freq === 'weekly') return acc + (s.amount * 52) / 12;
    return acc + s.amount;
  }, 0);

  const filteredSubs = savedSubs.filter((sub) => {
    const matchesSearch = sub.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? sub.status === 'ACTIVE'
        : sub.status !== 'ACTIVE';
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {result ? (
        <UnifiedResultRenderer
          result={result}
          onReset={() => {
            setResult(null);
            fetchSubscriptions();
          }}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Subscriptions
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Audit recurring bills, find forgotten memberships, and track real commitments in SQLite.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={openAddModal} className="flex items-center gap-1.5 min-h-[44px]">
                <Plus className="w-4 h-4" />
                <span>Add Subscription</span>
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Subscriptions</span>
                <Repeat className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {activeSubs.length}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                {savedSubs.length - activeSubs.length} cancelled/inactive
              </span>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Monthly Commitment</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(monthlyEquivalent, '₹')}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Normalized monthly cost
              </span>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Yearly Total</span>
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalAnnualCost, '₹')}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Annual commitment
              </span>
            </Card>
          </div>

          {/* Statement Audit Drop Zone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Scan Bank Statement or CSV</span>
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero bank credentials requested</span>
              </div>
            </div>
            <UnifiedDropZone
              explicitIntent="SUBSCRIPTION_ANALYSIS"
              onAnalysisComplete={(res) => {
                setResult(res);
                fetchSubscriptions();
              }}
            />
          </div>

          {/* Subscriptions List Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter subscriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['ALL', 'ACTIVE', 'CANCELLED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
                      statusFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Cancelled'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading tracked subscriptions...</p>
            ) : filteredSubs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSubs.map((sub) => (
                  <Card key={sub.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {sub.merchant}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {formatCurrency(sub.amount, sub.currency)} / {sub.frequency}
                        </span>
                      </div>
                      <Badge
                        variant={sub.status === 'ACTIVE' ? 'success' : 'default'}
                        size="sm"
                      >
                        {sub.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500">
                        Yearly: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(sub.estimatedYearlyCost, sub.currency)}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatusToggle(sub.id, sub.status)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 min-h-[36px]"
                        >
                          {sub.status === 'ACTIVE' ? 'Mark Cancelled' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => openEditModal(sub)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg"
                          aria-label={`Edit ${sub.merchant}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg"
                          aria-label={`Delete ${sub.merchant}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Repeat className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium">Nothing tracked yet.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click &quot;Add Subscription&quot; above to track one manually, or scan your bank statement to detect recurring charges automatically.
                </p>
              </Card>
            )}
          </div>

          {/* Add / Edit Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingSub ? 'Edit Subscription' : 'Add Subscription'}
            description="Track recurring subscriptions and memberships directly in local SQLite."
          >
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Service / Merchant Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Gym, Google One, Spotify"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 649"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Billing Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px]"
                >
                  {submitting ? 'Saving...' : editingSub ? 'Update Subscription' : 'Add Subscription'}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}

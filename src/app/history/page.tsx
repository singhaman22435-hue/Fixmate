'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  History,
  Search,
  Trash2,
  Download,
  FileCode,
  FileText,
  ArrowRight,
  Shield,
  Filter,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

interface HistoryItem {
  id: string;
  title: string;
  intent: string;
  inputType: string;
  summary: string;
  confidence: number;
  riskLevel: string | null;
  aiModelUsed: string | null;
  createdAt: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState('ALL');
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (intentFilter !== 'ALL') params.set('intent', intentFilter);

      const res = await fetch(`/api/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, intentFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setItems([]);
      setShowClearModal(false);
    } catch (err) {
      console.error('Failed to clear all history:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>Local Analysis History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Stored locally in SQLite dev.db. Never sent to any external server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?format=json"
            download="fixmate_history.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </a>

          <a
            href="/api/export?format=markdown"
            download="fixmate_history.md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export MD</span>
          </a>

          {items.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowClearModal(true)}
              className="h-8 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems, bills, merchants, or errors..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="TECHNICAL_ERROR">Technical Errors</option>
            <option value="BILL_EXPLANATION">Bills &amp; Invoices</option>
            <option value="SUBSCRIPTION_ANALYSIS">Subscriptions</option>
            <option value="PRODUCT_ANALYSIS">Product Scans</option>
            <option value="SCAM_ANALYSIS">Scam Checks</option>
            <option value="VOICE_TASK_EXTRACTION">Voice Notes</option>
            <option value="GENERAL_QUESTION">General Help</option>
          </select>
        </div>
      </div>

      {/* History Items List */}
      {loading ? (
        <p className="text-xs text-slate-400 py-8 text-center">Loading local history...</p>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/history/${item.id}`}
              className="block p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all group text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="info" size="sm">
                      {item.intent.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[11px] text-slate-400 uppercase font-mono">
                      {item.inputType}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.aiModelUsed || 'local'}
                    </span>
                    {item.riskLevel && (
                      <Badge
                        variant={
                          item.riskLevel === 'HIGH'
                            ? 'destructive'
                            : item.riskLevel === 'MEDIUM'
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                      >
                        {item.riskLevel} Risk
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                  <button
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Delete history entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <History className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No history entries found
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? 'Try modifying your search or clearing the category filter.'
              : 'Analyses you run will be securely preserved in your local SQLite database.'}
          </p>
        </Card>
      )}

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Wipe Local Analysis History?"
        description="This will permanently delete all stored analyses, extracted tasks, and subscription records from your local SQLite database. This action cannot be undone."
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            Yes, Wipe All Data
          </Button>
        </div>
      </Modal>
    </div>
  );
}

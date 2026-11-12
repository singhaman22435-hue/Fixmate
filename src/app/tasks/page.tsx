'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  CheckSquare,
  Square,
  Calendar,
  Clock,
  User,
  Trash2,
  Copy,
  Check,
  Download,
  Plus,
  Pencil,
  Search,
  Filter,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface TaskRecord {
  id: string;
  title: string;
  dueDate: string | null;
  time: string | null;
  priority: string;
  person: string | null;
  notes: string | null;
  completed: boolean;
  createdAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [copied, setCopied] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    time: '',
    priority: 'MEDIUM',
    person: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      dueDate: '',
      time: '',
      priority: 'MEDIUM',
      person: '',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskRecord) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      dueDate: task.dueDate || '',
      time: task.time || '',
      priority: task.priority || 'MEDIUM',
      person: task.person || '',
      notes: task.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingTask) {
        const res = await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTask.id,
            ...formData,
          }),
        });
        if (!res.ok) throw new Error('Failed to update task');
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to create task');
      }

      setIsModalOpen(false);
      await fetchTasks();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = async (id: string, currentCompleted: boolean) => {
    const newStatus = !currentCompleted;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newStatus } : t))
    );

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: newStatus }),
      });
    } catch (e) {
      console.error('Failed to toggle task:', e);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const clearCompleted = async () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
    try {
      await fetch('/api/tasks?clearCompleted=true', { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to clear completed tasks:', e);
    }
  };

  const copyAsTodoList = () => {
    const activeTasks = tasks.filter((t) => !t.completed);
    const lines = activeTasks.map((t) => {
      const timeStr = t.time ? ` @ ${t.time}` : '';
      const dateStr = t.dueDate ? ` (${t.dueDate})` : '';
      const personStr = t.person ? ` - ${t.person}` : '';
      return `[ ] ${t.title}${dateStr}${timeStr}${personStr}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsICal = () => {
    let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FixMate//Tasks//EN\n`;
    tasks.forEach((t) => {
      ics += `BEGIN:VTODO\nUID:${t.id}\nSUMMARY:${t.title}\nSTATUS:${t.completed ? 'COMPLETED' : 'NEEDS-ACTION'}\nEND:VTODO\n`;
    });
    ics += `END:VCALENDAR`;

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fixmate_tasks.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Date classification helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.person && t.person.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority =
        priorityFilter === 'ALL' ? true : t.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  const groups = useMemo(() => {
    const today: TaskRecord[] = [];
    const tomorrow: TaskRecord[] = [];
    const later: TaskRecord[] = [];
    const completed: TaskRecord[] = [];

    const categorize = (t: TaskRecord): 'TODAY' | 'TOMORROW' | 'LATER' | 'COMPLETED' => {
      if (t.completed) return 'COMPLETED';
      if (!t.dueDate) return 'LATER';

      const due = t.dueDate.toLowerCase().trim();
      if (due === 'today' || due.startsWith(todayStr)) return 'TODAY';
      if (due === 'tomorrow' || due.startsWith(tomorrowStr)) return 'TOMORROW';
      return 'LATER';
    };

    filteredTasks.forEach((t) => {
      const cat = categorize(t);
      if (cat === 'COMPLETED') completed.push(t);
      else if (cat === 'TODAY') today.push(t);
      else if (cat === 'TOMORROW') tomorrow.push(t);
      else later.push(t);
    });

    return { today, tomorrow, later, completed };
  }, [filteredTasks, todayStr, tomorrowStr]);

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const renderTaskGroup = (title: string, list: TaskRecord[], badgeColor?: string) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              {list.length}
            </span>
          </div>
          {title === 'COMPLETED' && (
            <button
              onClick={clearCompleted}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline"
            >
              Clear completed
            </button>
          )}
        </div>

        <Card className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          {list.map((t) => (
            <div
              key={t.id}
              className={`p-3.5 flex items-start justify-between gap-3 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                t.completed ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/30' : ''
              }`}
            >
              <div
                onClick={() => toggleTask(t.id, t.completed)}
                className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
              >
                <button
                  type="button"
                  className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                  aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {t.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug ${
                      t.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {t.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {t.dueDate && (
                      <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-3 h-3" />
                        <span>{t.dueDate}</span>
                      </span>
                    )}
                    {t.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{t.time}</span>
                      </span>
                    )}
                    {t.person && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{t.person}</span>
                      </span>
                    )}
                    {t.priority === 'HIGH' && (
                      <Badge variant="destructive" size="sm">
                        High
                      </Badge>
                    )}
                    {t.priority === 'LOW' && (
                      <Badge variant="default" size="sm">
                        Low
                      </Badge>
                    )}
                    {t.notes && (
                      <span className="text-slate-400 italic truncate max-w-xs">
                        {t.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditModal(t)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label={`Edit ${t.title}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Action Items &amp; Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {pendingCount} pending task{pendingCount === 1 ? '' : 's'} stored in local SQLite checklist
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openAddModal} className="flex items-center gap-1.5 min-h-[44px]">
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>
          <Button size="sm" variant="outline" onClick={copyAsTodoList} className="min-h-[44px]">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy List'}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={downloadAsICal} className="min-h-[44px]">
            <Download className="w-3.5 h-3.5" />
            <span>Export .ics</span>
          </Button>
        </div>
      </div>

      {/* Search & Priority Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, dates, assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
                priorityFilter === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p === 'ALL' ? 'All Priorities' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Task Sections */}
      {loading ? (
        <p className="text-xs text-slate-400 py-6 text-center">Loading tasks from SQLite...</p>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-6">
          {renderTaskGroup('TODAY', groups.today)}
          {renderTaskGroup('TOMORROW', groups.tomorrow)}
          {renderTaskGroup('LATER', groups.later)}
          {renderTaskGroup('COMPLETED', groups.completed)}
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium">No tasks found.</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click &quot;Add Task&quot; above to create one, or dictate a voice note to extract actionable to-dos automatically.
          </p>
        </Card>
      )}

      {/* Add / Edit Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Add New Task'}
        description="Save actionable items directly into your local FixMate checklist."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Call Rahul to review quotation"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="text"
                placeholder="Today, Tomorrow, or YYYY-MM-DD"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time
              </label>
              <input
                type="text"
                placeholder="e.g. 5:00 PM"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Person / Assignee
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul, Electrician"
                value={formData.person}
                onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Additional context or phone numbers..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Save Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

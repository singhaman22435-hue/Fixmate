'use client';

import React, { useState } from 'react';
import { VoiceTaskResult, ExtractedTask } from '@/lib/analyzers/types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  CheckSquare,
  Square,
  Calendar,
  Clock,
  User,
  Copy,
  Check,
  Download,
  PlusCircle,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function VoiceTaskResultView({
  data,
  analysisId,
}: {
  data: VoiceTaskResult;
  analysisId?: string;
}) {
  const [tasks, setTasks] = useState<ExtractedTask[]>(data.tasks || []);
  const [copied, setCopied] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // Edit task modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    dueDate: '',
    time: '',
    person: '',
    priority: 'MEDIUM',
  });

  const toggleTask = async (index: number) => {
    const updated = [...tasks];
    updated[index].completed = !updated[index].completed;
    setTasks(updated);

    const targetTask = updated[index];
    if (targetTask.id) {
      try {
        await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetTask.id, completed: targetTask.completed }),
        });
      } catch (e) {
        console.error('Failed to update task state:', e);
      }
    }
  };

  const handleAddTasksToDb = async () => {
    setIsSaving(true);
    try {
      for (const t of tasks) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: t.title,
            dueDate: t.dueDate || null,
            time: t.time || null,
            priority: t.priority || 'MEDIUM',
            person: t.person || null,
            notes: t.notes || null,
            analysisId: analysisId || null,
          }),
        });
      }
      setSavedToDb(true);
    } catch (e) {
      console.error('Failed to save tasks:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (idx: number) => {
    const t = tasks[idx];
    setEditingIndex(idx);
    setEditFormData({
      title: t.title,
      dueDate: t.dueDate || '',
      time: t.time || '',
      person: t.person || '',
      priority: t.priority || 'MEDIUM',
    });
    setIsEditModalOpen(true);
  };

  const saveEditedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null) return;
    const updated = [...tasks];
    updated[editingIndex] = {
      ...updated[editingIndex],
      title: editFormData.title.trim(),
      dueDate: editFormData.dueDate.trim() || undefined,
      time: editFormData.time.trim() || undefined,
      person: editFormData.person.trim() || undefined,
      priority: editFormData.priority as 'LOW' | 'MEDIUM' | 'HIGH',
    };
    setTasks(updated);
    setIsEditModalOpen(false);
  };

  const copyAsTodoList = () => {
    const lines = tasks.map((t) => {
      const box = t.completed ? '[x]' : '[ ]';
      const timeStr = t.time ? ` @ ${t.time}` : '';
      const dateStr = t.dueDate ? ` (${t.dueDate})` : '';
      const personStr = t.person ? ` - with ${t.person}` : '';
      return `${box} ${t.title}${dateStr}${timeStr}${personStr}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsICal = () => {
    let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FixMate//Voice Tasks//EN\n`;
    tasks.forEach((t, i) => {
      ics += `BEGIN:VTODO\nUID:fixmate-task-${i}-${Date.now()}\nSUMMARY:${t.title}\nDESCRIPTION:${t.notes || t.title}\nSTATUS:${t.completed ? 'COMPLETED' : 'NEEDS-ACTION'}\nEND:VTODO\n`;
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Metadata */}
      <Card className="border-l-4 border-l-indigo-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Badge variant="info">Voice to To-Do</Badge>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyAsTodoList}
                className="min-h-[36px] text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Tasks'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadAsICal}
                className="min-h-[36px] text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export iCal</span>
              </Button>
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            {data.summary}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.rawTranscript && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic">
              &ldquo;{data.rawTranscript}&rdquo;
            </div>
          )}

          {/* Extracted metadata chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {data.detectedDates?.map((d, i) => (
              <Badge key={i} variant="default" size="sm">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{d}</span>
              </Badge>
            ))}
            {data.detectedPeople?.map((p, i) => (
              <Badge key={i} variant="default" size="sm">
                <User className="w-3 h-3 text-slate-400" />
                <span>{p}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Action Bar (Section 11 Requirement) */}
      {!cancelled && (
        <Card className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {savedToDb ? 'Tasks added to your SQLite checklist!' : 'Review extracted action items'}
              </h4>
              <p className="text-xs text-indigo-800/80 dark:text-indigo-300 mt-0.5">
                {savedToDb
                  ? 'You can view and manage these on the Tasks tab.'
                  : 'Confirm to add these items to your persistent checklist, or edit them first.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!savedToDb ? (
                <>
                  <Button
                    onClick={handleAddTasksToDb}
                    disabled={isSaving || tasks.length === 0}
                    className="flex items-center gap-1.5 min-h-[44px]"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isSaving ? 'Adding...' : 'Add tasks to checklist'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCancelled(true)}
                    className="min-h-[44px] text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <a
                  href="/tasks"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 min-h-[44px]"
                >
                  <span>Open Tasks Checklist</span>
                </a>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Interactive Task Checklist */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Actionable Tasks ({tasks.filter((t) => t.completed).length}/{tasks.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`py-3.5 px-2 flex items-start justify-between gap-3 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    task.completed ? 'opacity-60 line-through' : ''
                  }`}
                >
                  <div
                    onClick={() => toggleTask(idx)}
                    className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                      aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {task.dueDate && (
                          <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                            <Calendar className="w-3 h-3" />
                            <span>{task.dueDate}</span>
                          </span>
                        )}
                        {task.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{task.time}</span>
                          </span>
                        )}
                        {task.person && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{task.person}</span>
                          </span>
                        )}
                        {task.priority === 'HIGH' && (
                          <Badge variant="destructive" size="sm">
                            High Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(idx)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label={`Edit ${task.title}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No tasks extracted.</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Task Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Voice Task"
        description="Adjust details before adding to your checklist."
      >
        <form onSubmit={saveEditedTask} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
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
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                placeholder="Tomorrow, Today, or YYYY-MM-DD"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time
              </label>
              <input
                type="text"
                value={editFormData.time}
                onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                placeholder="5:00 PM"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assignee / Person
              </label>
              <input
                type="text"
                value={editFormData.person}
                onChange={(e) => setEditFormData({ ...editFormData, person: e.target.value })}
                placeholder="Rahul"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={editFormData.priority}
                onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-[44px]">
              Apply Edit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

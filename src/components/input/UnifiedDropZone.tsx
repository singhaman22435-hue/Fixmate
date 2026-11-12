'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Camera,
  Mic,
  X,
  ArrowRight,
  Loader2,
  FileText,
  FileImage,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AudioRecorder } from './AudioRecorder';
import { FixMateIntent, PipelineExecutionResult } from '@/lib/analyzers/types';
import { formatFileSize } from '@/lib/utils/formatters';

export interface UnifiedDropZoneProps {
  explicitIntent?: FixMateIntent;
  onAnalysisComplete: (result: PipelineExecutionResult) => void;
  onClearIntent?: () => void;
}

export function UnifiedDropZone({
  explicitIntent,
  onAnalysisComplete,
  onClearIntent,
}: UnifiedDropZoneProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const clearFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleVoiceRecorded = (audioBlob: Blob | null, transcript: string) => {
    if (transcript) {
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    }
    if (audioBlob) {
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      setSelectedFile(audioFile);
    }
    setShowVoiceRecorder(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedFile && (!inputText || inputText.trim().length === 0)) {
      setErrorMessage('Please type a problem or attach a file.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      if (inputText.trim()) formData.append('text', inputText.trim());
      if (explicitIntent) formData.append('intent', explicitIntent);
      formData.append('saveToHistory', 'true');

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data: PipelineExecutionResult = await res.json();
      onAnalysisComplete(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please check local services.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <FileImage className="w-4 h-4 text-blue-600" />;
    if (mime === 'application/pdf') return <FileText className="w-4 h-4 text-rose-600" />;
    if (mime.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    return <FileText className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border bg-white dark:bg-slate-900 transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Active target banner if user clicked a quick help category */}
          {explicitIntent && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Category:{' '}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {explicitIntent.replace(/_/g, ' ')}
                </span>
              </span>
              {onClearIntent && (
                <button
                  type="button"
                  onClick={onClearIntent}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs flex items-center gap-1"
                >
                  <span>Clear</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Attached File Preview Bar */}
          {selectedFile && (
            <div className="m-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                {filePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="p-2 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0">
                    {getFileIcon(selectedFile.type)}
                  </div>
                )}
                <div className="truncate text-left text-xs">
                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-slate-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearFile}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Remove attached file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Voice Recorder Block if opened */}
          {showVoiceRecorder && (
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <AudioRecorder onRecorded={handleVoiceRecorded} isProcessing={isSubmitting} />
            </div>
          )}

          {/* Text Area */}
          <div className="p-4">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or paste your problem... (e.g. an error message, suspicious text, bill question, or notes)"
              className="w-full text-sm bg-transparent placeholder:text-slate-400 focus:outline-none text-slate-900 dark:text-slate-100 resize-none leading-relaxed"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mx-4 mb-3 p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl">
            {/* Input Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept="image/*,application/pdf,text/csv,text/plain,audio/*"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs font-normal"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Upload</span>
              </Button>

              {/* Camera */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="h-8 text-xs font-normal"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Camera</span>
              </Button>

              {/* Voice */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`h-8 text-xs font-normal ${
                  showVoiceRecorder ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600' : ''
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Voice</span>
              </Button>
            </div>

            {/* Solve CTA */}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || (!selectedFile && !inputText.trim())}
              isLoading={isSubmitting}
              className="h-9 px-4 text-xs font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Solving...</span>
                </>
              ) : (
                <>
                  <span>Solve</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

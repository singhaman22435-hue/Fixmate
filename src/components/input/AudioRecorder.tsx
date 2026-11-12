'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

// Web Speech API interface declaration for TypeScript
interface IWindow extends Window {
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechRecognition?: new () => SpeechRecognition;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

export interface AudioRecorderProps {
  onRecorded: (audioBlob: Blob | null, liveTranscript: string) => void;
  isProcessing?: boolean;
}

export function AudioRecorder({ onRecorded, isProcessing }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestTranscriptRef = useRef('');

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    setTranscript('');
    latestTranscriptRef.current = '';
    setTimerSeconds(0);
    audioChunksRef.current = [];

    // 1. Initialize Web Speech API for real-time local transcription
    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = '';
          for (let i = 0; i < Object.keys(event.results).length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          const cleanTranscript = currentTranscript.trim();
          latestTranscriptRef.current = cleanTranscript;
          setTranscript(cleanTranscript);
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition warning:', e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Could not initialize Web Speech API:', e);
      }
    }

    // 2. Initialize MediaRecorder for audio blob
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        // Always pass the fresh latest transcript ref, avoiding stale closure
        const finalTranscript = latestTranscriptRef.current || transcript;
        onRecorded(audioBlob, finalTranscript);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Microphone access failed: ${msg}. Check browser permissions.`);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      {errorMessage && (
        <div className="w-full mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            disabled={isProcessing}
            variant="primary"
            className="rounded-full w-14 h-14 p-0 shadow-lg shadow-indigo-500/25 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700"
            aria-label="Start recording voice note"
          >
            <Mic className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            variant="destructive"
            className="rounded-full w-14 h-14 p-0 shadow-lg shadow-rose-500/25 flex items-center justify-center animate-pulse"
            aria-label="Stop recording voice note"
          >
            <Square className="w-5 h-5 fill-current" />
          </Button>
        )}

        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              {isRecording ? 'Listening...' : 'Voice Dictation'}
            </span>
            {isRecording && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-xs font-mono font-bold">
                {formatTimer(timerSeconds)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isRecording
              ? 'Speak naturally: tasks, dates, contacts, errands'
              : 'Tap microphone to speak your task or note'}
          </p>
        </div>
      </div>

      {/* Live Transcript Preview */}
      {transcript && (
        <div className="w-full mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 italic">
          &ldquo;{transcript}&rdquo;
        </div>
      )}
    </div>
  );
}


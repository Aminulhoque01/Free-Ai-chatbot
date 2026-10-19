
"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";

type ChatComposerProps = {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (files: File[]) => void;
};

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.48-8.48" />
    </svg>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  return recording ? (
    <svg viewBox="0 0 24 24" fill="currentColor"
      className="h-5 w-5" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" />
    </svg>
  );
}

export default function ChatComposer({
  input,
  setInput,
  loading,
  textareaRef,
  onSend,
}: ChatComposerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function handleChange(value: string) {
    setInput(value);

    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height =
        `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return;

    setError("");

    const maxSize = 10 * 1024 * 1024;
    const incoming = Array.from(selected);
    const valid: File[] = [];

    for (const file of incoming) {
      if (file.size > maxSize) {
        setError(`${file.name}: maximum file size is 10 MB.`);
        continue;
      }

      valid.push(file);
    }

    setFiles((previous) => {
      const combined = [...previous];

      for (const file of valid) {
        const duplicate = combined.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );

        if (!duplicate) combined.push(file);
      }

      return combined;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  async function startRecording() {
    setError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Your browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : "webm";

        const audioFile = new File(
          chunksRef.current,
          `voice-${Date.now()}.${extension}`,
          { type }
        );

        if (audioFile.size > 0) {
          if (audioFile.size > 10 * 1024 * 1024) {
            setError("Voice recording exceeds the 10 MB limit.");
          } else {
            setFiles((previous) => [...previous, audioFile]);
          }
        }

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError(
        "Microphone access denied. Please allow microphone permission."
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function handleSend() {
    if (loading || (!input.trim() && files.length === 0)) return;

    onSend([...files]);
    setFiles([]);
    setError("");

    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "auto";
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[26px] border border-black/10 bg-white shadow-sm transition focus-within:border-black/20 dark:border-white/10 dark:bg-[#303030] dark:focus-within:border-white/20">

          {/* Attached files */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-4">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex max-w-full items-center gap-2 rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                >
                  <span className="text-gray-500">
                    {file.type.startsWith("audio/")
                      ? "🎙️"
                      : file.type.startsWith("image/")
                        ? "🖼️"
                        : "📎"}
                  </span>

                  <div className="min-w-0">
                    <p className="max-w-[180px] truncate font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={loading || recording}
                    aria-label={`Remove ${file.name}`}
                    className="ml-1 rounded-full px-2 py-1 text-gray-500 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message My AI..."
            rows={1}
            disabled={loading}
            aria-label="Write a message"
            className="max-h-[180px] min-h-[52px] w-full resize-none bg-transparent px-5 pb-2 pt-[17px] text-[15px] leading-6 outline-none placeholder:text-gray-500 disabled:opacity-60"
          />

          {error && (
            <p role="alert" className="px-4 pb-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 px-3 pb-3">
            <div className="flex min-w-0 items-center gap-1">
              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.m4a,.ogg,.webm,.mp4"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || recording}
                aria-label="Attach files"
                title="Attach files"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-black disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <PaperclipIcon />
              </button>

              {/* Voice recording */}
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                aria-label={recording ? "Stop recording" : "Record voice"}
                title={recording ? "Stop recording" : "Record voice"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                  recording
                    ? "animate-pulse bg-red-500 text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <MicIcon recording={recording} />
              </button>

              <span className="hidden pl-1 text-[11px] text-gray-400 sm:inline">
                {recording
                  ? "Recording... click ■ to stop"
                  : "Enter to send · Shift + Enter for new line"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={
                loading ||
                recording ||
                (!input.trim() && files.length === 0)
              }
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-gray-500">
          AI can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
}

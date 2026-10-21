"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject, KeyboardEvent } from "react";

type ChatComposerProps = {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (files: File[]) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.48-8.48" />
    </svg>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  return recording ? (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" />
    </svg>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";

  return "webm";
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
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const mountedRef = useRef(true);
  const shouldRestoreFocusRef = useRef(false);

  // Keep focus on the composer after a message has finished sending.
  useEffect(() => {
    if (!loading && shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      textareaRef.current?.focus();
    }
  }, [loading, textareaRef]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
      mediaRecorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recordedAudio) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(recordedAudio);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [recordedAudio]);

  useEffect(() => {
    if (!recording) return;

    const timer = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recording]);

  function handleChange(value: string) {
    setInput(value);

    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return;

    setError("");

    const valid: File[] = [];

    for (const file of Array.from(selected)) {
      if (file.size === 0) {
        setError(`${file.name}: this file is empty.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
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

        if (!duplicate) {
          combined.push(file);
        }
      }

      return combined;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Return focus to the composer after choosing attachments.
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function removeFile(index: number) {
    setFiles((previous) => previous.filter((_, i) => i !== index));
  }

  async function startRecording() {
    if (loading || recording) return;

    setError("");
    setRecordedAudio(null);
    setRecordingSeconds(0);
    cancelRecordingRef.current = false;
    chunksRef.current = [];

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Your browser does not support audio recording. Please use a supported browser."
      );
      return;
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const supportedMimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (mountedRef.current) {
          setError("Recording failed. Please try again.");
        }
      };

      recorder.onstop = () => {
        const actualType =
          recorder.mimeType ||
          chunksRef.current.find((chunk) => chunk.type)?.type ||
          "audio/webm";

        const normalizedType = actualType.split(";")[0].trim();
        const extension = getAudioExtension(normalizedType);

        const audioBlob = new Blob(chunksRef.current, {
          type: normalizedType,
        });

        const audioFile = new File(
          [audioBlob],
          `voice-${Date.now()}.${extension}`,
          {
            type: normalizedType,
            lastModified: Date.now(),
          }
        );

        chunksRef.current = [];

        stream?.getTracks().forEach((track) => track.stop());

        if (streamRef.current === stream) {
          streamRef.current = null;
        }

        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }

        if (!mountedRef.current) return;

        setRecording(false);

        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          return;
        }

        if (audioFile.size === 0) {
          setError("No audio was recorded. Please try again.");
          return;
        }

        if (audioFile.size > MAX_FILE_SIZE) {
          setError("Voice recording exceeds the 10 MB limit.");
          return;
        }

        setRecordedAudio(audioFile);

        // Keep the composer ready for typing.
        requestAnimationFrame(() => textareaRef.current?.focus());
      };

      recorder.start(250);
      setRecording(true);
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
      mediaRecorderRef.current = null;

      if (!mountedRef.current) return;

      setRecording(false);

      const errorName = err instanceof Error ? err.name : "";

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setError(
          "Microphone access denied. Please allow microphone permission and try again."
        );
      } else if (errorName === "NotFoundError") {
        setError("No microphone was found on your device.");
      } else {
        setError("Could not start recording. Please try again.");
      }
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function cancelRecording() {
    cancelRecordingRef.current = true;

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      setRecording(false);
      cancelRecordingRef.current = false;
    }

    chunksRef.current = [];
    setRecordedAudio(null);
    setError("");
    setRecordingSeconds(0);

    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function removeRecordedAudio() {
    setRecordedAudio(null);
    setError("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleSend() {
    if (loading || recording) return;

    const outgoingFiles = recordedAudio
      ? [...files, recordedAudio]
      : [...files];

    if (!input.trim() && outgoingFiles.length === 0) return;

    try {
      // Restore focus after the parent finishes the send operation.
      shouldRestoreFocusRef.current = true;

      onSend(outgoingFiles);

      setFiles([]);
      setRecordedAudio(null);
      setError("");
      setRecordingSeconds(0);

      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = "auto";
      }

      // If the parent does not set loading, focus immediately as well.
      requestAnimationFrame(() => {
        if (!loading) {
          shouldRestoreFocusRef.current = false;
          textareaRef.current?.focus();
        }
      });
    } catch {
      shouldRestoreFocusRef.current = false;
      setError("Could not send your message. Please try again.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[26px] border border-black/10 bg-white shadow-sm transition focus-within:border-black/20 dark:border-white/10 dark:bg-[#303030] dark:focus-within:border-white/20">
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
                    className="ml-1 rounded-full px-2 py-1 text-gray-500 hover:bg-gray-200 hover:text-red-500 disabled:opacity-40 dark:hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {recordedAudio && previewUrl && (
            <div className="mx-4 mt-3 rounded-2xl border border-black/10 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  🎙️ Voice message ready
                </p>

                <button
                  type="button"
                  onClick={removeRecordedAudio}
                  disabled={loading}
                  aria-label="Remove recorded voice"
                  className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-200 hover:text-red-500 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  ×
                </button>
              </div>

              <audio
                controls
                preload="metadata"
                src={previewUrl}
                className="w-full"
              />

              <p className="mt-1 text-xs text-gray-500">
                {recordedAudio.type || "audio"} ·{" "}
                {(recordedAudio.size / 1024).toFixed(1)} KB
              </p>
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

              {recording && (
                <>
                  <span className="text-xs font-medium tabular-nums text-red-500">
                    REC {formatDuration(recordingSeconds)}
                  </span>

                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="ml-1 rounded-full px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </>
              )}

              {!recording && (
                <span className="hidden pl-1 text-[11px] text-gray-400 sm:inline">
                  Enter to send · Shift + Enter for new line
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={
                loading ||
                recording ||
                (!input.trim() && files.length === 0 && !recordedAudio)
              }
              aria-label="Send message"
              title="Send message"
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

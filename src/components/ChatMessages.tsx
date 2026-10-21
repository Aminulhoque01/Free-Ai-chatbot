
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export type Attachment = {
  name: string;
  type: string;
  size: number;
  puterPath?: string;
  url?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  loading: boolean;
  error?: string | null;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
  onRetry: () => void;
  onSuggestion: (suggestion: string) => void;
};

const SUGGESTIONS = [
  "Explain this concept simply",
  "Write code for me",
  "Help me debug an error",
  "Give me some project ideas",
];

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M5.64 9A7 7 0 0 1 17.5 6.5L20 12" />
      <path d="M18.36 15A7 7 0 0 1 6.5 17.5L4 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

/**
 * ReactMarkdown + rehype-highlight কখনো code-এর children-কে
 * nested React elements-এ রূপান্তর করে।
 *
 * সরাসরি String(children) ব্যবহার করলে "[object Object]"
 * পাওয়া যেতে পারে। এই function nested elements থেকে
 * আসল text নিরাপদে বের করে।
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") {
    return node;
  }

  if (typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return "";
}

/**
 * Clipboard API ব্যর্থ হলে textarea fallback ব্যবহার করবে।
 */
async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Clipboard API ব্যর্থ হলে নিচের fallback চলবে।
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available.");
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");

  Object.assign(textarea.style, {
    position: "fixed",
    top: "0",
    left: "-9999px",
    width: "1px",
    height: "1px",
    padding: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Browser clipboard fallback failed.");
    }
  } finally {
    textarea.remove();
  }
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) {
    return "Unknown size";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getAttachmentKind(
  attachment: Attachment,
): "image" | "video" | "audio" | "pdf" | "file" {
  const type = (attachment.type || "").toLowerCase();
  const name = (attachment.name || "").toLowerCase();

  if (type.startsWith("image/")) {
    return "image";
  }

  if (type.startsWith("video/")) {
    return "video";
  }

  if (type.startsWith("audio/")) {
    return "audio";
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  return "file";
}

function FileIcon({
  kind,
}: {
  kind: ReturnType<typeof getAttachmentKind>;
}) {
  const labels: Record<typeof kind, string> = {
    image: "IMG",
    video: "VID",
    audio: "AUD",
    pdf: "PDF",
    file: "FILE",
  };

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 text-[10px] font-bold tracking-wide dark:bg-white/10"
      aria-hidden="true"
    >
      {labels[kind]}
    </span>
  );
}

function AttachmentPreview({
  attachment,
}: {
  attachment: Attachment;
}) {
  const kind = getAttachmentKind(attachment);
  const url = attachment.url;

  return (
    <div className="mt-3 max-w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
      {url && kind === "image" && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block"
          aria-label={`Open image ${attachment.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={attachment.name}
            loading="lazy"
            className="max-h-80 max-w-full object-contain"
          />
        </a>
      )}

      {url && kind === "video" && (
        <video
          src={url}
          controls
          preload="metadata"
          className="max-h-80 w-full bg-black"
        >
          Your browser does not support video playback.
        </video>
      )}

      {url && kind === "audio" && (
        <div className="p-3">
          <p className="mb-2 truncate text-sm font-medium">
            {attachment.name}
          </p>

          <audio
            src={url}
            controls
            preload="metadata"
            className="w-full"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {(!url || kind === "pdf" || kind === "file") && (
        <div className="flex min-w-0 items-center gap-3 p-3">
          <FileIcon kind={kind} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {attachment.name}
            </p>

            <p className="mt-1 text-xs opacity-60">
              {formatFileSize(attachment.size)}
            </p>
          </div>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={attachment.name}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={`Download ${attachment.name}`}
              title="Download file"
            >
              <DownloadIcon />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function CodeBlock({
  children,
  className,
  ...props
}: React.ComponentProps<"code">) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBlock = Boolean(className?.includes("language-"));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    // IMPORTANT: Never use String(children) for highlighted React nodes.
    const text = extractText(children).replace(/\n$/, "");

    if (!text) {
      setCopyError(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCopyError(false);
      }, 2500);

      return;
    }

    try {
      await copyTextToClipboard(text);

      setCopied(true);
      setCopyError(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy code:", error);

      setCopied(false);
      setCopyError(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCopyError(false);
      }, 2500);
    }
  };

  if (!isBlock) {
    return (
      <code
        className={`rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/10 ${
          className ?? ""
        }`}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="group/code relative my-4 min-w-0 overflow-hidden rounded-xl border border-black/10 bg-[#0d1117] text-gray-100 dark:border-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
        <span className="text-xs text-gray-400">
          {className?.replace("language-", "") || "code"}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
          title="Copy code"
        >
          <CopyIcon />
          {copyError ? "Copy failed" : copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <pre className="max-w-full overflow-x-auto p-4 text-sm leading-6">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  code: CodeBlock,

  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-words text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
      {...props}
    >
      {children}
    </a>
  ),

  table: ({ children, ...props }) => (
    <div className="my-4 max-w-full overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),

  th: ({ children, ...props }) => (
    <th
      className="border border-black/10 bg-black/5 px-3 py-2 font-semibold dark:border-white/10 dark:bg-white/5"
      {...props}
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td
      className="border border-black/10 px-3 py-2 dark:border-white/10"
      {...props}
    >
      {children}
    </td>
  ),

  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-3 border-l-4 border-black/20 pl-4 italic opacity-80 dark:border-white/20"
      {...props}
    >
      {children}
    </blockquote>
  ),

  ul: ({ children, ...props }) => (
    <ul className="my-3 list-disc space-y-1 pl-6" {...props}>
      {children}
    </ul>
  ),

  ol: ({ children, ...props }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6" {...props}>
      {children}
    </ol>
  ),

  h1: ({ children, ...props }) => (
    <h1 className="mb-3 mt-5 text-2xl font-bold" {...props}>
      {children}
    </h1>
  ),

  h2: ({ children, ...props }) => (
    <h2 className="mb-3 mt-5 text-xl font-bold" {...props}>
      {children}
    </h2>
  ),

  h3: ({ children, ...props }) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold" {...props}>
      {children}
    </h3>
  ),

  p: ({ children, ...props }) => (
    <p className="my-2 leading-7" {...props}>
      {children}
    </p>
  ),
};

export default function ChatMessages({
  messages,
  loading,
  error,
  copiedIndex,
  onCopy,
  onRetry,
  onSuggestion,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        "SpeechSynthesisUtterance" in window,
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeaking = () => {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    setSpeakingIndex(null);
  };

  const toggleReadAloud = (content: string, index: number) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      return;
    }

    if (speakingIndex === index) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-8"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!hasMessages && !loading && !error && (
          <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-2xl font-bold dark:border-white/10 dark:bg-white/[0.04]">
              AI
            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How can I help you today?
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-black/55 dark:text-white/55">
              Ask a question, explore an idea, write code, or upload a
              file to get started.
            </p>

            <div className="mt-7 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestion(suggestion)}
                  className="rounded-xl border border-black/10 px-4 py-3 text-left text-sm transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const attachments = message.attachments ?? [];

            return (
              <article
                key={`${index}-${message.role}`}
                className={`flex w-full min-w-0 gap-3 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/[0.04] text-xs font-bold dark:border-white/10 dark:bg-white/[0.06]">
                    AI
                  </div>
                )}

                <div
                  className={`min-w-0 max-w-[92%] sm:max-w-[85%] ${
                    isUser
                      ? "rounded-2xl rounded-br-md bg-black/[0.06] px-4 py-3 dark:bg-white/[0.08]"
                      : "flex-1"
                  }`}
                >
                  {message.content.trim() !== "" && (
                    <div
                      className={`min-w-0 break-words text-sm sm:text-[15px] ${
                        isUser
                          ? "whitespace-pre-wrap leading-7"
                          : "markdown-content leading-7"
                      }`}
                    >
                      {isUser ? (
                        message.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={markdownComponents}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attachments.map((attachment, attachmentIndex) => (
                        <AttachmentPreview
                          key={`${attachment.name}-${attachmentIndex}`}
                          attachment={attachment}
                        />
                      ))}
                    </div>
                  )}

                  {!isUser && message.content.trim() !== "" && (
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onCopy(message.content, index)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                        aria-label="Copy assistant response"
                        title="Copy response"
                      >
                        <CopyIcon />
                        {copiedIndex === index ? "Copied" : "Copy"}
                      </button>

                      {speechSupported && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleReadAloud(message.content, index)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                          aria-label={
                            speakingIndex === index
                              ? "Stop reading response aloud"
                              : "Read response aloud"
                          }
                          title={
                            speakingIndex === index
                              ? "Stop reading"
                              : "Read aloud"
                          }
                        >
                          {speakingIndex === index ? (
                            <StopIcon />
                          ) : (
                            <SpeakerIcon />
                          )}

                          {speakingIndex === index ? "Stop" : "Read aloud"}
                        </button>
                      )}

                      {index === messages.length - 1 && !loading && (
                        <button
                          type="button"
                          onClick={onRetry}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                          aria-label="Retry response"
                          title="Retry response"
                        >
                          <RetryIcon />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white dark:bg-white dark:text-black">
                    You
                  </div>
                )}
              </article>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3" role="status">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/[0.04] text-xs font-bold dark:border-white/10 dark:bg-white/[0.06]">
                AI
              </div>

              <div className="flex items-center gap-1.5 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-40 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-current opacity-80" />
                <span className="sr-only">Assistant is thinking</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm"
              role="alert"
            >
              <p className="font-medium text-red-600 dark:text-red-400">
                Something went wrong
              </p>

              <p className="mt-1 break-words text-red-700/90 dark:text-red-300/90">
                {error}
              </p>

              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
              >
                <RetryIcon />
                Try again
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  loading: boolean;
  error: string;
  copiedIndex: number | null;
  onCopy: (content: string, index: number) => void;
  onRetry: () => void;
  onSuggestion: (prompt: string) => void;
};

function Icon({
  name,
  size = 20,
}: {
  name: "bot" | "copy";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (name === "bot") {
    return (
      <svg {...common}>
        <rect x="3" y="8" width="18" height="12" rx="3" />
        <path d="M12 3v5M8 13h.01M16 13h.01M9 17h6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

const suggestions = [
  {
    title: "Learn JavaScript",
    desc: "Explain closures with examples",
  },
  {
    title: "Build a project",
    desc: "Give me a full-stack project idea",
  },
  {
    title: "Fix my code",
    desc: "Help me debug a React component",
  },
  {
    title: "Explore AI",
    desc: "How do large language models work?",
  },
];

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex min-h-full flex-col items-center justify-center px-4 pb-20">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#292929]">
            <Icon name="bot" size={30} />
          </div>

          <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            What can I help with?
          </h1>

          <p className="mt-3 text-center text-sm text-gray-500">
            Ask a question, learn something new, or build something amazing.
          </p>

          <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() =>
                  onSuggestion(`${item.title}: ${item.desc}`)
                }
                className="rounded-2xl border border-black/10 p-4 text-left transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="block text-sm font-medium">
                  {item.title}
                </span>

                <span className="mt-1 block text-xs leading-5 text-gray-500">
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-6">
          {messages.map((message, index) => (
            <div key={`${index}-${message.role}`} className="mb-7">
              {message.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-3xl bg-[#f4f4f4] px-4 py-3 leading-7 dark:bg-[#303030] sm:max-w-[80%]">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 sm:gap-4">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                    <Icon name="bot" size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="whitespace-pre-wrap break-words text-[15px] leading-7">
                      {message.content}
                    </div>

                    <button
                      type="button"
                      onClick={() => onCopy(message.content, index)}
                      className="mt-3 flex items-center gap-1.5 rounded-lg p-1.5 text-xs text-gray-500 transition hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Icon name="copy" size={15} />
                      {copiedIndex === index ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                <Icon name="bot" size={19} />
              </div>

              <div className="flex items-center gap-1 pt-2">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.25s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.12s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />

                <span className="ml-2 text-sm text-gray-500">
                  Thinking...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="ml-11 mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500"
            >
              {error}

              <button
                type="button"
                onClick={onRetry}
                className="ml-2 underline"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
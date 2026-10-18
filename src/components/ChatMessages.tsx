
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

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
  size = 18,
}: {
  name: "bot" | "copy" | "check" | "refresh";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "bot":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="14" rx="3" />
          <path d="M12 3v4M8 13h.01M16 13h.01M8 17h8" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.4-4" />
        </svg>
      );

    case "copy":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="13" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </svg>
      );
  }
}

function getText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getText).join("");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getText(node.props.children);
  }

  return "";
}

const suggestions = [
  {
    title: "Explain a concept",
    prompt: "Explain JavaScript closures with a simple example.",
  },
  {
    title: "Write some code",
    prompt: "Write a JavaScript function to remove duplicate values from an array.",
  },
  {
    title: "Debug my code",
    prompt: "How can I debug errors in a Next.js application?",
  },
  {
    title: "Learn something new",
    prompt: "Give me a beginner-friendly roadmap for learning AI as a web developer.",
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
    } catch {
      // Clipboard access may be unavailable in some browser contexts.
      setCopiedCode(null);
    }
  }

  const markdownComponents: Components = {
    pre({ children, node: _node, ...props }) {
      const code = getText(children);

      return (
        <div className="group/code relative my-4 min-w-0">
          <button
            type="button"
            onClick={() => void copyCode(code)}
            className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-white/10 bg-[#343434] px-2.5 py-1.5 text-xs text-gray-200 transition hover:bg-[#454545]"
            aria-label="Copy code"
          >
            <Icon
              name={copiedCode === code ? "check" : "copy"}
              size={13}
            />
            {copiedCode === code ? "Copied!" : "Copy code"}
          </button>

          <pre
            {...props}
            className="!my-0 overflow-x-auto rounded-xl border border-white/10 bg-[#0d1117] px-4 pb-4 pt-12 text-sm leading-6 text-gray-100"
          >
            {children}
          </pre>
        </div>
      );
    },

    code({ children, className, ...props }) {
      const isBlockCode = Boolean(className?.includes("language-"));

      return (
        <code
          {...props}
          className={
            isBlockCode
              ? className
              : "rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
          }
        >
          {children}
        </code>
      );
    },

    a({ children, ...props }) {
      return (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline underline-offset-2 hover:text-blue-500 dark:text-blue-400"
        >
          {children}
        </a>
      );
    },

    table({ children, ...props }) {
      return (
        <div className="my-4 max-w-full overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table
            {...props}
            className="w-full border-collapse text-left text-sm"
          >
            {children}
          </table>
        </div>
      );
    },

    th({ children, ...props }) {
      return (
        <th
          {...props}
          className="border-b border-black/10 bg-black/5 px-3 py-2 font-semibold dark:border-white/10 dark:bg-white/5"
        >
          {children}
        </th>
      );
    },

    td({ children, ...props }) {
      return (
        <td
          {...props}
          className="border-b border-black/5 px-3 py-2 dark:border-white/5"
        >
          {children}
        </td>
      );
    },
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-6 pt-6 sm:px-6">
      {messages.length === 0 && !loading && !error && (
        <div className="flex min-h-[55vh] flex-col items-center justify-center py-10 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.06] dark:bg-white/[0.08]">
            <Icon name="bot" size={30} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How can I help you today?
          </h2>

          <p className="mt-3 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
            Ask a question, explore an idea, or get help with your code.
          </p>

          <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.title}
                type="button"
                onClick={() => onSuggestion(suggestion.prompt)}
                className="rounded-xl border border-black/10 p-4 text-left transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.05]"
              >
                <span className="block text-sm font-medium">
                  {suggestion.title}
                </span>
                <span className="mt-1.5 block text-sm leading-5 text-gray-500 dark:text-gray-400">
                  {suggestion.prompt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-7">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}`}
            className={`flex min-w-0 gap-3 sm:gap-4 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.09]">
                <Icon name="bot" size={17} />
              </div>
            )}

            <div
              className={`min-w-0 max-w-[90%] sm:max-w-[85%] ${
                message.role === "user"
                  ? "rounded-2xl rounded-br-md bg-black/[0.06] px-4 py-3 dark:bg-white/[0.08]"
                  : "flex-1 pt-1"
              }`}
            >
              {message.role === "user" ? (
                <div className="whitespace-pre-wrap break-words text-sm leading-7">
                  {message.content}
                </div>
              ) : (
                <div className="markdown-content min-w-0 break-words text-[15px] leading-7">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {message.role === "assistant" && (
                <button
                  type="button"
                  onClick={() => onCopy(message.content, index)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md p-1.5 text-xs text-gray-500 transition hover:bg-black/[0.05] hover:text-gray-800 dark:hover:bg-white/[0.08] dark:hover:text-gray-200"
                  aria-label="Copy message"
                >
                  <Icon
                    name={copiedIndex === index ? "check" : "copy"}
                    size={14}
                  />
                  {copiedIndex === index ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.09]">
              <Icon name="bot" size={17} />
            </div>

            <div className="flex items-center gap-1.5 pt-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Thinking...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>

            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
            >
              <Icon name="refresh" size={14} />
              Try again
            </button>
          </div>
        )}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}

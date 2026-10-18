"use client";

import type { RefObject } from "react";

type ChatComposerProps = {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
};

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
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
  function handleChange(value: string) {
    setInput(value);

    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[26px] border border-black/10 bg-white shadow-sm transition focus-within:border-black/20 dark:border-white/10 dark:bg-[#303030] dark:focus-within:border-white/20">
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

          <div className="flex items-center justify-between px-3 pb-3">
            <span className="pl-2 text-[11px] text-gray-400">
              Enter to send · Shift + Enter for new line
            </span>

            <button
              type="button"
              onClick={onSend}
              disabled={loading || !input.trim()}
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
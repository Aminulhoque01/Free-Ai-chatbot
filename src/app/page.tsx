
"use client";

import { useEffect, useRef, useState } from "react";
import puter from "@heyputer/puter.js";
import Sidebar from "../components/Sidebar";
import ChatMessages from "../components/ChatMessages";
import ChatComposer from "../components/ChatComposer";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

function Icon({
  name,
  size = 20,
}: {
  name: string;
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
  };

  switch (name) {
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case "send":
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L10 18l-5 1 1-5Z" />
        </svg>
      );

    case "message":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      );

    case "bot":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="12" rx="3" />
          <path d="M12 3v5M8 13h.01M16 13h.01M9 17h6" />
        </svg>
      );

    case "copy":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [chatsLoaded, setChatsLoaded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find((chat) => chat.id === activeId);
  const messages = activeChat?.messages ?? [];

  // Load saved conversations.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("free-ai-chatbot-chats");

      if (saved) {
        const parsed = JSON.parse(saved) as Chat[];

        if (Array.isArray(parsed)) {
          setChats(parsed);

          if (parsed.length > 0) {
            setActiveId(parsed[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Could not load saved chats:", err);
    } finally {
      setChatsLoaded(true);
    }
  }, []);

  // Save conversations after the initial load.
  useEffect(() => {
    if (!chatsLoaded) return;

    try {
      localStorage.setItem(
        "free-ai-chatbot-chats",
        JSON.stringify(chats)
      );
    } catch (err) {
      console.error("Could not save chats:", err);
    }
  }, [chats, chatsLoaded]);

  function newChat() {
    if (loading) return;

    setActiveId("");
    setInput("");
    setError("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  function selectChat(id: string) {
    setActiveId(id);
    setError("");
    setSidebarOpen(false);
  }

  async function sendMessage(text?: string) {
    const prompt = (text ?? input).trim();

    if (!prompt || loading) return;

    let chatId = activeId;
    let currentMessages = messages;

    if (!chatId) {
      chatId = crypto.randomUUID();
      currentMessages = [];

      const newConversation: Chat = {
        id: chatId,
        title: prompt.slice(0, 40),
        messages: [],
      };

      setChats((prev) => [newConversation, ...prev]);
      setActiveId(chatId);
    }

    const userMessage: Message = {
      role: "user",
      content: prompt,
    };

    const updatedMessages = [...currentMessages, userMessage];

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title:
                chat.messages.length === 0
                  ? prompt.slice(0, 40)
                  : chat.title,
              messages: updatedMessages,
            }
          : chat
      )
    );

    setInput("");
    setError("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const history = updatedMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const response = await puter.ai.chat(history);
      const content = response.message?.content;

      const answer =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content
                .map((part) =>
                  typeof part === "string"
                    ? part
                    : "text" in part
                      ? String(part.text ?? "")
                      : ""
                )
                .join("")
            : String(content ?? "");

      if (!answer.trim()) {
        throw new Error(
          "AI কোনো text response দেয়নি। আবার চেষ্টা করো।"
        );
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: answer,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...updatedMessages, assistantMessage],
              }
            : chat
        )
      );
    } catch (err) {
      console.error("Puter AI error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "AI response পাওয়া যায়নি। আবার চেষ্টা করো।"
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function copyMessage(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content);

      setCopiedIndex(index);

      window.setTimeout(() => {
        setCopiedIndex(null);
      }, 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  return (
    <main className="flex h-dvh min-h-0 overflow-hidden bg-white text-[#0d0d0d] dark:bg-[#212121] dark:text-[#ececec]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        chats={chats}
        activeId={activeId}
        sidebarOpen={sidebarOpen}
        onNewChat={newChat}
        onSelectChat={selectChat}
        onClose={() => setSidebarOpen(false)}
        onDeleteChat={(id) => {
          setChats((prev) =>
            prev.filter((chat) => chat.id !== id)
          );

          if (activeId === id) {
            setActiveId("");
            setError("");
          }
        }}
      />

      {/* Main chat area */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="z-10 flex h-[60px] shrink-0 items-center justify-between px-3 md:px-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 md:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>

            <span className="text-base font-semibold">
              My AI
            </span>

            <span className="hidden rounded-full border border-black/10 px-2 py-1 text-[10px] text-gray-500 dark:border-white/10 sm:inline">
              PREVIEW
            </span>
          </div>

          <button
            onClick={newChat}
            title="New chat"
            disabled={loading}
            className="rounded-lg p-2 hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
          >
            <Icon name="edit" size={19} />
          </button>
        </header>

        {/* Scrollable messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ChatMessages
            messages={messages}
            loading={loading}
            error={error}
            copiedIndex={copiedIndex}
            onCopy={copyMessage}
            onRetry={() => {
              const lastUserMessage = [...messages]
                .reverse()
                .find((message) => message.role === "user");

              if (lastUserMessage) {
                void sendMessage(lastUserMessage.content);
              }
            }}
            onSuggestion={(prompt) => {
              void sendMessage(prompt);
            }}
          />
        </div>

        {/* Bottom composer */}
        <div className="z-10 shrink-0 bg-white dark:bg-[#212121]">
          <ChatComposer
            input={input}
            setInput={setInput}
            loading={loading}
            textareaRef={textareaRef}
            onSend={() => void sendMessage()}
          />
        </div>
      </section>
    </main>
  );
}

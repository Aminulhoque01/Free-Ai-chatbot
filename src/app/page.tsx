
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import puter from "@heyputer/puter.js";

import Sidebar from "../components/Sidebar";
import ChatMessages from "../components/ChatMessages";
import ChatComposer from "../components/ChatComposer";

type Attachment = {
  name: string;
  type: string;
  size: number;
  puterPath: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

type UndoDelete = {
  chat: Chat;
  index: number;
  wasActive: boolean;
};

type StreamPart = {
  type?: string;
  text?: string;
  message?: string;
  error?: { message?: string };
  delta?: { text?: string; content?: string };
  choices?: Array<{
    delta?: { content?: string };
  }>;
};

const STORAGE_KEY = "free-ai-chatbot-chats";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isAudioFile(file: File) {
  return (
    file.type.startsWith("audio/") ||
    /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.test(file.name)
  );
}

function getFileNames(files: Attachment[]) {
  return files.map((file) => file.name).join(", ");
}

function safeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "attachment"
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function createAbortError() {
  return new DOMException("Operation cancelled.", "AbortError");
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function getStreamText(part: StreamPart | string): string {
  if (typeof part === "string") return part;

  if (part.type === "error") {
    throw new Error(
      part.error?.message ||
        part.message ||
        "An error occurred while generating the response."
    );
  }

  if (typeof part.text === "string") return part.text;
  if (typeof part.delta?.text === "string") return part.delta.text;
  if (typeof part.delta?.content === "string") return part.delta.content;

  const choiceText = part.choices?.[0]?.delta?.content;
  return typeof choiceText === "string" ? choiceText : "";
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
  const [undoDeleteItem, setUndoDeleteItem] =
    useState<UndoDelete | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest values available to asynchronous operations.
  const chatsRef = useRef<Chat[]>([]);
  const activeIdRef = useRef("");
  const requestIdRef = useRef(0);
  const busyRef = useRef(false);
  const chatsLoadedRef = useRef(false);

  const activeChat = chats.find((chat) => chat.id === activeId);
  const messages = activeChat?.messages ?? [];

  const commitChats = useCallback(
    (updater: (previous: Chat[]) => Chat[]) => {
      const next = updater(chatsRef.current);
      chatsRef.current = next;
      setChats(next);
    },
    []
  );

  const changeActiveId = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  const isCurrentOperation = useCallback(
    (id: number, controller: AbortController) =>
      requestIdRef.current === id && !controller.signal.aborted,
    []
  );

  // Load saved conversations.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const validChats = parsed.filter(
            (chat): chat is Chat =>
              chat !== null &&
              typeof chat === "object" &&
              typeof chat.id === "string" &&
              typeof chat.title === "string" &&
              Array.isArray(chat.messages)
          );

          chatsRef.current = validChats;
          setChats(validChats);

          // Preserve the previous behavior: start with no selected chat.
          changeActiveId("");
        }
      }
    } catch (err) {
      console.error("Could not load saved chats:", err);
    } finally {
      chatsLoadedRef.current = true;
      setChatsLoaded(true);
    }
  }, [changeActiveId]);

  // Save conversations only after the initial restore.
  useEffect(() => {
    if (!chatsLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (err) {
      console.error("Could not save chats:", err);
      setError(
        "Chat history could not be saved. Browser storage may be full."
      );
    }
  }, [chats, chatsLoaded]);

  // Cancel active work and invalidate its request ID.
  const abortActiveOperation = useCallback(() => {
    requestIdRef.current += 1;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    busyRef.current = false;
    setLoading(false);
  }, []);

  // Update a chat only if it still exists.
  const updateChatMessages = useCallback(
    (chatId: string, updater: (previous: Message[]) => Message[]) => {
      commitChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? { ...chat, messages: updater(chat.messages) }
            : chat
        )
      );
    },
    [commitChats]
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      abortControllerRef.current?.abort();
    };
  }, []);

  function newChat() {
    abortActiveOperation();

    setError("");
    setInput("");
    changeActiveId("");
    setSidebarOpen(false);

    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function selectChat(chatId: string) {
    if (activeIdRef.current !== chatId) {
      abortActiveOperation();
    }

    changeActiveId(chatId);
    setError("");
    setInput("");
    setSidebarOpen(false);

    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function deleteChat(chatId: string) {
    const currentChats = chatsRef.current;
    const index = currentChats.findIndex((chat) => chat.id === chatId);

    if (index === -1) return;

    const chat = currentChats[index];
    const wasActive = activeIdRef.current === chatId;

    if (wasActive) {
      abortActiveOperation();
    }

    setUndoDeleteItem({ chat, index, wasActive });

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    undoTimerRef.current = setTimeout(() => {
      setUndoDeleteItem(null);
      undoTimerRef.current = null;
    }, 5000);

    commitChats((previous) =>
      previous.filter((item) => item.id !== chatId)
    );

    if (wasActive) {
      changeActiveId("");
      setInput("");
      setError("");
    }
  }

  function undoDeleteChat() {
    if (!undoDeleteItem) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const { chat, index, wasActive } = undoDeleteItem;

    commitChats((previous) => {
      if (previous.some((item) => item.id === chat.id)) {
        return previous;
      }

      const restored = [...previous];
      restored.splice(Math.min(index, restored.length), 0, chat);
      return restored;
    });

    if (wasActive) {
      changeActiveId(chat.id);
    }

    setUndoDeleteItem(null);
  }

  function stopGeneration() {
    abortActiveOperation();
    setError("");
  }

  /**
   * Transcribe audio and upload other files using the existing Puter API.
   * The upload mechanism is deliberately kept unchanged.
   */
  async function processFiles(
    selectedFiles: File[],
    controller: AbortController,
    requestId: number
  ): Promise<{ attachments: Attachment[]; transcripts: string[] }> {
    const attachments: Attachment[] = [];
    const transcripts: string[] = [];

    for (const file of selectedFiles) {
      if (!isCurrentOperation(requestId, controller)) {
        throw createAbortError();
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `${file.name} is larger than 10 MB. Please choose a smaller file.`
        );
      }

      if (isAudioFile(file)) {
        const speech2txt = (puter.ai as any).speech2txt;

        if (typeof speech2txt !== "function") {
          throw new Error(
            "Audio transcription is unavailable. Check your Puter.js installation."
          );
        }

        const result = await speech2txt(file, {
          response_format: "text",
        });

        if (!isCurrentOperation(requestId, controller)) {
          throw createAbortError();
        }

        const transcript =
          typeof result === "string" ? result : result?.text;

        if (typeof transcript !== "string" || !transcript.trim()) {
          throw new Error(
            `Could not transcribe "${file.name}". Try another audio file.`
          );
        }

        transcripts.push(
          `Transcription of "${file.name}":\n${transcript.trim()}`
        );

        continue;
      }

      const uniqueName = `${Date.now()}-${createId()}-${safeFileName(file.name)}`;
      const destination = `uploads/${uniqueName}`;

      try {
        await (puter.fs as any).mkdir("uploads");
      } catch (mkdirError) {
        const message = getErrorMessage(mkdirError).toLowerCase();

        const alreadyExists =
          message.includes("already exists") ||
          message.includes("file_exists") ||
          message.includes("directory exists");

        if (!alreadyExists) {
          console.warn(
            "Could not create uploads directory; attempting the existing write flow.",
            mkdirError
          );
        }
      }

      if (!isCurrentOperation(requestId, controller)) {
        throw createAbortError();
      }

      let savedFile: any;

      try {
        savedFile = await (puter.fs as any).write(destination, file);
      } catch (writeError) {
        if (!isCurrentOperation(requestId, controller)) {
          throw createAbortError();
        }

        const fallbackPath =
          `${Date.now()}-${createId()}-${safeFileName(file.name)}`;

        try {
          savedFile = await (puter.fs as any).write(fallbackPath, file);
        } catch {
          throw new Error(
            `Could not upload "${file.name}" to Puter storage. ${getErrorMessage(writeError)}`
          );
        }
      }

      if (!isCurrentOperation(requestId, controller)) {
        throw createAbortError();
      }

      const puterPath = savedFile?.path ?? savedFile?.file?.path;

      if (typeof puterPath !== "string" || !puterPath.trim()) {
        throw new Error(
          `Puter did not return a valid storage path for "${file.name}".`
        );
      }

      attachments.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        puterPath,
      });
    }

    return { attachments, transcripts };
  }

  /**
   * Generate an assistant response.
   * A stale request cannot update messages or the error state.
   */
  async function generateResponse(
    chatId: string,
    history: Message[],
    controller: AbortController,
    requestId: number
  ) {
    let answer = "";

    const updateAssistant = (content: string) => {
      if (!isCurrentOperation(requestId, controller)) return;

      updateChatMessages(chatId, (previous) => {
        const updated = [...previous];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];

        if (last?.role === "assistant") {
          updated[lastIndex] = { ...last, content };
        }

        return updated;
      });
    };

    updateChatMessages(chatId, (previous) => [
      ...previous,
      { role: "assistant", content: "" },
    ]);

    try {
      const aiHistory = history.map((message) => {
        if (
          message.role !== "user" ||
          !message.attachments?.length
        ) {
          return {
            role: message.role,
            content: message.content,
          };
        }

        return {
          role: "user",
          content: [
            ...message.attachments.map((file) => ({
              type: "file",
              puter_path: file.puterPath,
            })),
            {
              type: "text",
              text:
                message.content ||
                "Please analyze the attached file and explain its contents.",
            },
          ],
        };
      });

      if (!isCurrentOperation(requestId, controller)) {
        throw createAbortError();
      }

      const response = await (puter.ai.chat as any)(
        aiHistory,
        false,
        {
          stream: true,
          signal: controller.signal,
        }
      );

      if (!response || typeof response[Symbol.asyncIterator] !== "function") {
        throw new Error(
          "The AI did not return a readable stream. Please try again."
        );
      }

      for await (const part of response as AsyncIterable<StreamPart | string>) {
        if (!isCurrentOperation(requestId, controller)) {
          throw createAbortError();
        }

        const chunk = getStreamText(part);

        if (chunk) {
          answer += chunk;
          updateAssistant(answer);
        }
      }

      if (!isCurrentOperation(requestId, controller)) {
        throw createAbortError();
      }

      if (!answer.trim()) {
        throw new Error(
          "The AI returned an empty response. Please try again."
        );
      }
    } catch (err) {
      if (
        !isCurrentOperation(requestId, controller) ||
        isAbortError(err)
      ) {
        // Keep any partial response already received.
        updateChatMessages(chatId, (previous) =>
          previous.filter(
            (message, index) =>
              !(
                index === previous.length - 1 &&
                message.role === "assistant" &&
                !message.content
              )
          )
        );

        return;
      }

      // Preserve partial output. Remove only an empty placeholder.
      updateChatMessages(chatId, (previous) =>
        previous.filter(
          (message, index) =>
            !(
              index === previous.length - 1 &&
              message.role === "assistant" &&
              !message.content
            )
        )
      );

      throw err;
    }
  }

  async function sendMessage(
    text?: string,
    selectedFiles: File[] = []
  ) {
    if (busyRef.current) return;

    const typedText = (text ?? input).trim();

    if (!typedText && selectedFiles.length === 0) return;

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const initialActiveId = activeIdRef.current;

    abortControllerRef.current = controller;
    busyRef.current = true;

    setLoading(true);
    setError("");

    try {
      let attachments: Attachment[] = [];
      let transcripts: string[] = [];

      if (selectedFiles.length > 0) {
        const processed = await processFiles(
          selectedFiles,
          controller,
          requestId
        );

        attachments = processed.attachments;
        transcripts = processed.transcripts;
      }

      if (!isCurrentOperation(requestId, controller)) {
        throw createAbortError();
      }

      // Prevent an upload started in one chat from being sent to another.
      if (activeIdRef.current !== initialActiveId) {
        throw createAbortError();
      }

      const combinedText = [
        typedText,
        ...transcripts,
        attachments.length
          ? `Attached files: ${getFileNames(attachments)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!combinedText && attachments.length === 0) {
        throw new Error("Please enter a message or select a file.");
      }

      const userMessage: Message = {
        role: "user",
        content:
          combinedText ||
          "Please analyze the attached file and explain its contents.",
        ...(attachments.length ? { attachments } : {}),
      };

      const currentChat = chatsRef.current.find(
        (chat) => chat.id === initialActiveId
      );

      let chatId: string;
      let history: Message[];

      if (!currentChat) {
        chatId = createId();

        const titleSource =
          typedText ||
          transcripts[0]?.split("\n").slice(1).join(" ") ||
          getFileNames(attachments) ||
          "New chat";

        const newConversation: Chat = {
          id: chatId,
          title:
            titleSource.length > 40
              ? `${titleSource.slice(0, 40)}...`
              : titleSource,
          messages: [userMessage],
        };

        commitChats((previous) => [newConversation, ...previous]);
        changeActiveId(chatId);
        history = [userMessage];
      } else {
        chatId = currentChat.id;
        history = [...currentChat.messages, userMessage];

        commitChats((previous) =>
          previous.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: history,
                  title:
                    chat.messages.length === 0
                      ? (
                          typedText ||
                          getFileNames(attachments) ||
                          "New chat"
                        ).slice(0, 40)
                      : chat.title,
                }
              : chat
          )
        );
      }

      setInput("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      await generateResponse(
        chatId,
        history,
        controller,
        requestId
      );
    } catch (err) {
      if (
        isCurrentOperation(requestId, controller) &&
        !isAbortError(err)
      ) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        busyRef.current = false;
        setLoading(false);
        textareaRef.current?.focus();
      }
    }
  }

  async function regenerateResponse() {
    if (busyRef.current) return;

    const chatId = activeIdRef.current;
    const currentChat = chatsRef.current.find(
      (chat) => chat.id === chatId
    );

    if (!currentChat) return;

    const lastUserIndex = currentChat.messages
      .map((message) => message.role)
      .lastIndexOf("user");

    if (lastUserIndex === -1) return;

    const history = currentChat.messages.slice(0, lastUserIndex + 1);

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    abortControllerRef.current = controller;
    busyRef.current = true;

    setLoading(true);
    setError("");

    commitChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: history }
          : chat
      )
    );

    try {
      await generateResponse(
        chatId,
        history,
        controller,
        requestId
      );
    } catch (err) {
      if (
        isCurrentOperation(requestId, controller) &&
        !isAbortError(err)
      ) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        busyRef.current = false;
        setLoading(false);
      }
    }
  }

  async function copyMessage(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex((current) =>
          current === index ? null : current
        );
      }, 1800);
    } catch {
      setError("Could not copy this message.");
    }
  }

  function handleSuggestion(suggestion: string) {
    setInput(suggestion);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-white text-gray-900 dark:bg-[#212121] dark:text-gray-100">
      <Sidebar
        chats={chats}
        activeId={activeId}
        sidebarOpen={sidebarOpen}
        onNewChat={newChat}
        onSelectChat={selectChat}
        onClose={() => setSidebarOpen(false)}
        onDeleteChat={deleteChat}
        onRenameChat={(id, title) => {
          const cleanTitle = title.trim();
          if (!cleanTitle) return;

          commitChats((previous) =>
            previous.map((chat) =>
              chat.id === id
                ? { ...chat, title: cleanTitle }
                : chat
            )
          );
        }}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 dark:border-white/10 dark:bg-[#212121] sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/10 md:hidden"
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h1 className="truncate text-sm font-semibold sm:text-base">
              {activeChat?.title || "My AI"}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {loading && (
              <button
                type="button"
                onClick={stopGeneration}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 dark:border-white/20 dark:hover:bg-white/10 sm:text-sm"
              >
                Stop
              </button>
            )}

            {!loading && messages.some(
              (message) => message.role === "assistant"
            ) && (
              <button
                type="button"
                onClick={() => void regenerateResponse()}
                title="Regenerate response"
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M20 7v5h-5M4 17v-5h5" />
                  <path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={newChat}
              title="New chat"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ChatMessages
            messages={messages}
            loading={loading}
            error={error}
            copiedIndex={copiedIndex}
            onCopy={copyMessage}
            onRetry={() => void regenerateResponse()}
            onSuggestion={handleSuggestion}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mx-auto mb-2 flex w-[min(100%-2rem,48rem)] items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            <p className="min-w-0 break-words">{error}</p>
            <button
              type="button"
              onClick={() => void regenerateResponse()}
              disabled={loading || !activeChat?.messages.some(
                (message) => message.role === "user"
              )}
              className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-50"
            >
              Retry
            </button>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className="shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        <div className="z-10 shrink-0 bg-white dark:bg-[#212121]">
          <ChatComposer
            input={input}
            setInput={setInput}
            loading={loading}
            textareaRef={textareaRef}
            onSend={(files: File[]) => {
              void sendMessage(undefined, files);
            }}
          />
        </div>
      </section>

      {undoDeleteItem && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-white/10 dark:bg-[#303030]">
          <span className="text-gray-800 dark:text-gray-100">
            Chat deleted
          </span>

          <button
            type="button"
            onClick={undoDeleteChat}
            className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Undo
          </button>

          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) {
                clearTimeout(undoTimerRef.current);
                undoTimerRef.current = null;
              }

              setUndoDeleteItem(null);
            }}
            aria-label="Dismiss"
            className="text-gray-500 hover:text-gray-800 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}

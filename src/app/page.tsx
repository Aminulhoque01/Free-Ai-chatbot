
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
  error?: {
    message?: string;
  };
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
  return name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "attachment";
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
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
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
  const busyRef = useRef(false);

  const activeChat = chats.find((chat) => chat.id === activeId);
  const messages = activeChat?.messages ?? [];

  // Load saved conversations.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setChats(parsed as Chat[]);
        }
      }
    } catch (err) {
      console.error("Could not load saved chats:", err);
    } finally {
      setChatsLoaded(true);
    }
  }, []);

  // Save conversations.
  useEffect(() => {
    if (!chatsLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (err) {
      console.error("Could not save chats:", err);
    }
  }, [chats, chatsLoaded]);

  // Cleanup timers and active requests.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      abortControllerRef.current?.abort();
    };
  }, []);

  const updateChatMessages = useCallback(
    (chatId: string, updater: (previous: Message[]) => Message[]) => {
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? { ...chat, messages: updater(chat.messages) }
            : chat,
        ),
      );
    },
    [],
  );

  const abortActiveOperation = useCallback(() => {
    const controller = abortControllerRef.current;

    if (controller) {
      controller.abort();
      abortControllerRef.current = null;
    }

    busyRef.current = false;
    setLoading(false);
  }, []);

  function newChat() {
    abortActiveOperation();

    setError("");
    setInput("");
    setActiveId("");
    setSidebarOpen(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function selectChat(chatId: string) {
    abortActiveOperation();

    setActiveId(chatId);
    setError("");
    setInput("");
    setSidebarOpen(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function deleteChat(chatId: string) {
    const index = chats.findIndex((chat) => chat.id === chatId);

    if (index === -1) return;

    const chat = chats[index];
    const wasActive = activeId === chatId;

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

    setChats((previous) =>
      previous.filter((item) => item.id !== chatId),
    );

    if (wasActive) {
      setActiveId("");
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

    setChats((previous) => {
      if (previous.some((item) => item.id === chat.id)) {
        return previous;
      }

      const restored = [...previous];
      restored.splice(Math.min(index, restored.length), 0, chat);

      return restored;
    });

    if (wasActive) {
      setActiveId(chat.id);
    }

    setUndoDeleteItem(null);
  }

  function stopGeneration() {
    abortActiveOperation();
  }

  /**
   * Transcribe audio files and upload other files to Puter storage.
   * Uses fs.write instead of fs.upload to avoid the current upload path
   * that was producing the signedBatchWriteSupported error.
   */
  async function processFiles(
    selectedFiles: File[],
    controller: AbortController,
  ): Promise<{
    attachments: Attachment[];
    transcripts: string[];
  }> {
    const attachments: Attachment[] = [];
    const transcripts: string[] = [];

    for (const file of selectedFiles) {
      if (controller.signal.aborted) {
        throw createAbortError();
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `${file.name} is larger than 10 MB. Please choose a smaller file.`,
        );
      }

      if (isAudioFile(file)) {
        const speech2txt = (puter.ai as any).speech2txt;

        if (typeof speech2txt !== "function") {
          throw new Error(
            "Audio transcription is unavailable. Check your Puter.js installation.",
          );
        }

        const result = await speech2txt(file, {
          response_format: "text",
        });

        if (controller.signal.aborted) {
          throw createAbortError();
        }

        const transcript =
          typeof result === "string" ? result : result?.text;

        if (
          typeof transcript !== "string" ||
          !transcript.trim()
        ) {
          throw new Error(
            `Could not transcribe "${file.name}". Try another audio file.`,
          );
        }

        transcripts.push(
          `Transcription of "${file.name}":\n${transcript.trim()}`,
        );

        continue;
      }

      // Use a unique filename to prevent collisions.
      const uniqueName = `${Date.now()}-${createId()}-${safeFileName(file.name)}`;
      const destination = `uploads/${uniqueName}`;

      // Create the uploads directory if it does not exist.
      // Ignore the error only if the directory already exists.
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
            "Could not create uploads directory; trying the root directory.",
            mkdirError,
          );
        }
      }

      if (controller.signal.aborted) {
        throw createAbortError();
      }

      let savedFile: any;

      try {
        savedFile = await (puter.fs as any).write(
          destination,
          file,
        );
      } catch (writeError) {
        // Fallback to the root directory if the uploads directory
        // cannot be written to.
        if (controller.signal.aborted) {
          throw createAbortError();
        }

        const fallbackPath = `${Date.now()}-${createId()}-${safeFileName(file.name)}`;

        try {
          savedFile = await (puter.fs as any).write(
            fallbackPath,
            file,
          );
        } catch {
          throw new Error(
            `Could not upload "${file.name}" to Puter storage. ${getErrorMessage(writeError)}`,
          );
        }
      }

      if (controller.signal.aborted) {
        throw createAbortError();
      }

      const puterPath =
        savedFile?.path ??
        savedFile?.file?.path;

      if (
        typeof puterPath !== "string" ||
        !puterPath.trim()
      ) {
        throw new Error(
          `Puter did not return a valid storage path for "${file.name}".`,
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
   * Generate a streamed assistant response.
   */
  async function generateResponse(
    chatId: string,
    history: Message[],
    controller: AbortController,
  ) {
    let answer = "";

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

      if (controller.signal.aborted) {
        throw createAbortError();
      }

      const response = await (puter.ai.chat as any)(
        aiHistory,
        false,
        {
          stream: true,
          signal: controller.signal,
        },
      );

      for await (const part of response as AsyncIterable<StreamPart>) {
        if (controller.signal.aborted) {
          break;
        }

        if (part?.type === "error") {
          throw new Error(
            part.error?.message ||
              part.message ||
              "An error occurred while generating the response.",
          );
        }

        if (
          part?.type === "text" &&
          typeof part.text === "string"
        ) {
          answer += part.text;
        } else if (
          !part?.type &&
          typeof part?.text === "string"
        ) {
          answer += part.text;
        }

        if (answer) {
          const currentAnswer = answer;

          updateChatMessages(chatId, (previous) => {
            const updated = [...previous];
            const last = updated[updated.length - 1];

            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: currentAnswer,
              };
            }

            return updated;
          });
        }
      }
    } catch (err) {
      if (
        controller.signal.aborted ||
        isAbortError(err)
      ) {
        return;
      }

      // Remove the empty assistant placeholder if the request failed.
      updateChatMessages(chatId, (previous) =>
        previous.filter(
          (message, index) =>
            !(
              index === previous.length - 1 &&
              message.role === "assistant" &&
              !message.content
            ),
        ),
      );

      throw err;
    } finally {
      // On cancellation, remove only an empty placeholder.
      if (controller.signal.aborted) {
        updateChatMessages(chatId, (previous) =>
          previous.filter(
            (message, index) =>
              !(
                index === previous.length - 1 &&
                message.role === "assistant" &&
                !message.content
              ),
          ),
        );
      }
    }
  }

  async function sendMessage(
    text?: string,
    selectedFiles: File[] = [],
  ) {
    if (busyRef.current) return;

    const typedText = (text ?? input).trim();

    if (!typedText && selectedFiles.length === 0) {
      return;
    }

    const controller = new AbortController();

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
        );

        attachments = processed.attachments;
        transcripts = processed.transcripts;
      }

      if (controller.signal.aborted) {
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
        return;
      }

      const userMessage: Message = {
        role: "user",
        content:
          combinedText ||
          "Please analyze the attached file and explain its contents.",
        ...(attachments.length > 0 ? { attachments } : {}),
      };

      const existingChat = chats.find(
        (chat) => chat.id === activeId,
      );

      let chatId: string;
      let history: Message[];

      if (!existingChat) {
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

        setChats((previous) => [
          newConversation,
          ...previous,
        ]);

        setActiveId(chatId);
        history = [userMessage];
      } else {
        chatId = existingChat.id;
        history = [...existingChat.messages, userMessage];

        setChats((previous) =>
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
              : chat,
          ),
        );
      }

      setInput("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      await generateResponse(chatId, history, controller);
    } catch (err) {
      if (
        !controller.signal.aborted &&
        !isAbortError(err)
      ) {
        setError(getErrorMessage(err));
      }
    } finally {
      // An older operation must not reset a newer operation's state.
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        busyRef.current = false;
        setLoading(false);
        textareaRef.current?.focus();
      }
    }
  }

  async function regenerateResponse() {
    if (busyRef.current || !activeChat) return;

    const lastUserIndex = activeChat.messages
      .map((message) => message.role)
      .lastIndexOf("user");

    if (lastUserIndex === -1) return;

    const history = activeChat.messages.slice(
      0,
      lastUserIndex + 1,
    );

    const controller = new AbortController();

    abortControllerRef.current = controller;
    busyRef.current = true;

    setLoading(true);
    setError("");

    // Remove the old assistant response before regenerating.
    setChats((previous) =>
      previous.map((chat) =>
        chat.id === activeChat.id
          ? { ...chat, messages: history }
          : chat,
      ),
    );

    try {
      await generateResponse(
        activeChat.id,
        history,
        controller,
      );
    } catch (err) {
      if (
        !controller.signal.aborted &&
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

  async function copyMessage(
    content: string,
    index: number,
  ) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex((current) =>
          current === index ? null : current,
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
          setChats((previous) =>
            previous.map((chat) =>
              chat.id === id
                ? { ...chat, title }
                : chat,
            ),
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

            {!loading &&
              messages.some(
                (message) => message.role === "assistant",
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

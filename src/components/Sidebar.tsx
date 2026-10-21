

"use client";

import { useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

type SidebarProps = {
  chats: Chat[];
  activeId: string;
  sidebarOpen: boolean;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onClose: () => void;

  // Google authentication
  user: AuthUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
};

function Icon({
  name,
  size = 20,
}: {
  name:
    | "plus"
    | "message"
    | "close"
    | "bot"
    | "search"
    | "edit"
    | "check"
    | "google"
    | "logout"
    | "user";
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

  switch (name) {
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
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

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L10 18l-5 1 1-5Z" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "google":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
          />
          <path
            fill="#34A853"
            d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8V33c3.4 6.7 10.2 11 18.2 11Z"
          />
          <path
            fill="#FBBC05"
            d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.3H5.8a20 20 0 0 0 0 18Z"
          />
          <path
            fill="#EA4335"
            d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4 16 4 9.2 8.3 5.8 15l6.8 5.3C14.2 15.6 18.7 12 24 12Z"
          />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      );

    default:
      return null;
  }
}

export default function Sidebar({
  chats,
  activeId,
  sidebarOpen,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onClose,
  user,
  onLoginClick,
  onLogout,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Chat | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return chats;

    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(query)
    );
  }, [chats, search]);

  function startRename(chat: Chat) {
    setEditingId(chat.id);
    setEditingTitle(chat.title);
  }

  function cancelRename() {
    setEditingId(null);
    setEditingTitle("");
  }

  function saveRename(id: string) {
    const title = editingTitle.trim();

    if (!title) return;

    onRenameChat(id, title);
    cancelRename();
  }

  function confirmDelete() {
    if (!deleteTarget) return;

    onDeleteChat(deleteTarget.id);
    setDeleteTarget(null);
  }

  function handleLogin() {
    setAccountMenuOpen(false);
    onLoginClick();
  }

  function handleLogout() {
    setAccountMenuOpen(false);
    onLogout();
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Chat sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-[270px] shrink-0 flex-col bg-[#f9f9f9] p-3 transition-transform duration-200 dark:bg-[#171717] md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo and close button */}
        <div className="mb-6 flex items-center justify-between px-1 py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <Icon name="bot" size={23} />
            </div>

            <span className="text-base font-semibold tracking-tight">
              My AI
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 md:hidden"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* New chat */}
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-3 rounded-xl border border-black/10 px-3 py-3 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        >
          <Icon name="plus" size={19} />
          <span>New chat</span>
          <span className="ml-auto text-xs text-gray-400">⌘ K</span>
        </button>

        {/* Conversation heading */}
        <p className="mb-2 mt-7 px-2 text-xs font-semibold text-gray-500">
          Your conversations
        </p>

        {/* Search conversations */}
        <div className="relative mb-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon name="search" size={16} />
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full rounded-xl border border-black/10 bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>

        {/* Conversation list */}
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {chats.length === 0 && (
            <p className="px-2 py-3 text-xs leading-5 text-gray-500">
              Your conversations will appear here.
            </p>
          )}

          {chats.length > 0 && filteredChats.length === 0 && (
            <p className="px-2 py-3 text-xs leading-5 text-gray-500">
              No conversations found for &quot;{search}&quot;.
            </p>
          )}

          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="group flex min-w-0 items-center gap-1"
            >
              {editingId === chat.id ? (
                <form
                  className="min-w-0 flex-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveRename(chat.id);
                  }}
                >
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(event) =>
                      setEditingTitle(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") cancelRename();
                    }}
                    aria-label="Rename conversation"
                    className="w-full rounded-lg border border-black/20 bg-white px-2 py-2.5 text-sm outline-none focus:border-black/50 dark:border-white/20 dark:bg-[#252525] dark:focus:border-white/40"
                  />

                  <div className="mt-1 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!editingTitle.trim()}
                      className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1 text-xs text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/80"
                    >
                      <Icon name="check" size={12} />
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    title={chat.title}
                    aria-current={
                      activeId === chat.id ? "page" : undefined
                    }
                    className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm transition ${
                      activeId === chat.id
                        ? "bg-black/10 dark:bg-white/10"
                        : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0">
                      <Icon name="message" size={17} />
                    </span>

                    <span className="truncate">{chat.title}</span>
                  </button>

                  {/* Rename conversation */}
                  <button
                    type="button"
                    title="Rename conversation"
                    aria-label={`Rename ${chat.title}`}
                    onClick={() => startRename(chat)}
                    className="shrink-0 rounded-md p-2 text-gray-400 transition hover:bg-black/5 hover:text-current md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  >
                    <Icon name="edit" size={14} />
                  </button>

                  {/* Delete conversation */}
                  <button
                    type="button"
                    title="Delete conversation"
                    aria-label={`Delete ${chat.title}`}
                    onClick={() => setDeleteTarget(chat)}
                    className="shrink-0 rounded-md p-2 text-gray-400 transition hover:bg-red-500/10 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Account footer */}
        <div className="relative mt-3 border-t border-black/10 px-1 pt-3 dark:border-white/10">
          {user ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setAccountMenuOpen((previous) => !previous)
                }
                aria-expanded={accountMenuOpen}
                aria-label="Open account menu"
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/10"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-semibold text-white">
                    {user.name.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {user.name}
                  </p>

                  <p className="truncate text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>

                <span className="text-gray-400">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path
                      d={
                        accountMenuOpen
                          ? "m6 15 6-6 6 6"
                          : "m6 9 6 6 6-6"
                      }
                    />
                  </svg>
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#252525]">
                  <div className="border-b border-black/10 px-3 py-2 dark:border-white/10">
                    <p className="text-xs text-gray-500">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {user.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-500/10"
                  >
                    <Icon name="logout" size={17} />
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-white/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-semibold text-white">
                AI
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  My AI Assistant
                </p>

                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon name="google" size={13} />
                  Login with Google
                </p>
              </div>

              <span className="text-gray-400">
                <Icon name="user" size={17} />
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#252525]"
          >
            <h2
              id="delete-chat-title"
              className="text-lg font-semibold"
            >
              Delete conversation?
            </h2>

            <p className="mt-2 break-words text-sm leading-6 text-gray-500 dark:text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                &quot;{deleteTarget.title}&quot;
              </span>
              ? You can undo this action for a few seconds.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

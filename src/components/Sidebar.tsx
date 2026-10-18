"use client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

type SidebarProps = {
  chats: Chat[];
  activeId: string;
  sidebarOpen: boolean;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClose: () => void;
};

function Icon({
  name,
  size = 20,
}: {
  name: "plus" | "menu" | "message" | "close" | "bot";
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

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
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
  onClose,
}: SidebarProps) {
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

        {/* Conversation list */}
        <div className="flex-1 space-y-1 overflow-y-auto">
          {chats.length === 0 && (
            <p className="px-2 py-3 text-xs leading-5 text-gray-500">
              Your conversations will appear here.
            </p>
          )}

          {chats.map((chat) => (
            <div key={chat.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectChat(chat.id)}
                title={chat.title}
                aria-current={activeId === chat.id ? "page" : undefined}
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

              {/* Delete conversation */}
              <button
                type="button"
                title="Delete conversation"
                aria-label={`Delete ${chat.title}`}
                onClick={() => onDeleteChat(chat.id)}
                className="shrink-0 rounded-md p-2 text-gray-400 transition hover:bg-red-500/10 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="mt-3 border-t border-black/10 px-2 pt-4 dark:border-white/10">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-semibold text-white">
              AI
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                My AI Assistant
              </p>

              <p className="text-xs text-gray-500">
                Powered by Puter.js
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import ReactMarkdown, { type Components } from "react-markdown";
// import remarkGfm from "remark-gfm";
// import rehypeHighlight from "rehype-highlight";

// export type Attachment = {
//   name: string;
//   type: string;
//   size: number;
//   puterPath?: string;
// };

// export type ChatMessage = {
//   role: "user" | "assistant";
//   content: string;
//   attachments?: Attachment[];
// };

// type ChatMessagesProps = {
//   messages: ChatMessage[];
//   loading: boolean;
//   error: string;
//   copiedIndex: number | null;
//   onCopy: (content: string, index: number) => void;
//   onRetry: () => void;
//   onSuggestion: (prompt: string) => void;
// };

// type IconName =
//   | "bot"
//   | "copy"
//   | "check"
//   | "refresh"
//   | "file"
//   | "image"
//   | "audio"
//   | "video"
//   | "document"
//   | "sparkles"
//   | "arrow-up-right";

// function Icon({
//   name,
//   size = 18,
//   className = "",
// }: {
//   name: IconName;
//   size?: number;
//   className?: string;
// }) {
//   const common = {
//     width: size,
//     height: size,
//     viewBox: "0 0 24 24",
//     fill: "none",
//     stroke: "currentColor",
//     strokeWidth: 1.8,
//     strokeLinecap: "round" as const,
//     strokeLinejoin: "round" as const,
//     className,
//     "aria-hidden": true as const,
//   };

//   switch (name) {
//     case "bot":
//       return (
//         <svg {...common}>
//           <rect x="4" y="7" width="16" height="13" rx="4" />
//           <path d="M12 3v4M9 13h.01M15 13h.01M9 17h6" />
//           <path d="M4 12H2M22 12h-2" />
//         </svg>
//       );

//     case "copy":
//       return (
//         <svg {...common}>
//           <rect x="8" y="8" width="12" height="12" rx="2" />
//           <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
//         </svg>
//       );

//     case "check":
//       return (
//         <svg {...common}>
//           <path d="m5 12 4 4L19 6" />
//         </svg>
//       );

//     case "refresh":
//       return (
//         <svg {...common}>
//           <path d="M20 7v5h-5" />
//           <path d="M4 17v-5h5" />
//           <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12" />
//           <path d="M18.4 15a7 7 0 0 1-11.6 2L4 12" />
//         </svg>
//       );

//     case "image":
//       return (
//         <svg {...common}>
//           <rect x="3" y="3" width="18" height="18" rx="3" />
//           <circle cx="8.5" cy="8.5" r="1.5" />
//           <path d="m21 15-5-5L5 21" />
//         </svg>
//       );

//     case "audio":
//       return (
//         <svg {...common}>
//           <rect x="9" y="2" width="6" height="12" rx="3" />
//           <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
//         </svg>
//       );

//     case "video":
//       return (
//         <svg {...common}>
//           <rect x="3" y="5" width="13" height="14" rx="2" />
//           <path d="m16 10 5-3v10l-5-3" />
//         </svg>
//       );

//     case "document":
//     case "file":
//       return (
//         <svg {...common}>
//           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
//           <path d="M14 2v6h6M8 13h8M8 17h8" />
//         </svg>
//       );

//     case "sparkles":
//       return (
//         <svg {...common}>
//           <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
//           <path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" />
//         </svg>
//       );

//     case "arrow-up-right":
//       return (
//         <svg {...common}>
//           <path d="M7 17 17 7M7 7h10v10" />
//         </svg>
//       );

//     default:
//       return null;
//   }
// }

// function getText(node: React.ReactNode): string {
//   if (typeof node === "string" || typeof node === "number") {
//     return String(node);
//   }

//   if (Array.isArray(node)) {
//     return node.map(getText).join("");
//   }

//   if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
//     return getText(node.props.children);
//   }

//   return "";
// }

// function formatFileSize(bytes: number): string {
//   if (!Number.isFinite(bytes) || bytes < 0) return "";

//   if (bytes < 1024) return `${bytes} B`;

//   if (bytes < 1024 * 1024) {
//     return `${(bytes / 1024).toFixed(1)} KB`;
//   }

//   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
// }

// function getFileCategory(file: Attachment): IconName {
//   const name = file.name.toLowerCase();
//   const type = file.type.toLowerCase();
//   const extension = name.split(".").pop() ?? "";

//   if (
//     type.startsWith("image/") ||
//     ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)
//   ) {
//     return "image";
//   }

//   if (
//     type.startsWith("audio/") ||
//     ["mp3", "wav", "ogg", "m4a", "webm"].includes(extension)
//   ) {
//     return "audio";
//   }

//   if (
//     type.startsWith("video/") ||
//     ["mp4", "mov", "avi", "mkv"].includes(extension)
//   ) {
//     return "video";
//   }

//   if (
//     [
//       "pdf",
//       "txt",
//       "md",
//       "csv",
//       "json",
//       "doc",
//       "docx",
//       "xls",
//       "xlsx",
//       "ppt",
//       "pptx",
//     ].includes(extension)
//   ) {
//     return "document";
//   }

//   return "file";
// }

// function getDisplayContent(message: ChatMessage): string {
//   const content = message.content ?? "";
//   const attachments = message.attachments ?? [];

//   if (attachments.length === 0) return content;

//   const attachmentNames = attachments.map((file) => file.name).join(", ");
//   const suffix = `Attached files: ${attachmentNames}`;

//   if (content.endsWith(`\n\n${suffix}`)) {
//     return content.slice(0, -(suffix.length + 2)).trimEnd();
//   }

//   if (content.endsWith(suffix)) {
//     return content.slice(0, -suffix.length).trimEnd();
//   }

//   return content;
// }

// function AttachmentList({ files }: { files: Attachment[] }) {
//   if (!files.length) return null;

//   return (
//     <div className="mb-3 flex max-w-full flex-wrap gap-2">
//       {files.map((file, index) => {
//         const category = getFileCategory(file);

//         return (
//           <div
//             key={`${file.name}-${file.size}-${index}`}
//             title={file.name}
//             className="flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 dark:bg-white/[0.04]"
//           >
//             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-current">
//               <Icon name={category} size={20} />
//             </div>

//             <div className="min-w-0">
//               <p className="max-w-[220px] truncate text-sm font-medium">
//                 {file.name}
//               </p>

//               <p className="mt-0.5 text-xs opacity-60">
//                 {file.size > 0 ? formatFileSize(file.size) : "Attachment"}
//                 {file.type ? ` · ${file.type}` : ""}
//               </p>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// /**
//  * Separate component so React Hooks are used safely.
//  * Also clears the copy feedback timer when the component unmounts.
//  */
// function CodeBlock({ children }: { children?: React.ReactNode }) {
//   const [copied, setCopied] = useState(false);
//   const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const code = getText(children).replace(/\n$/, "");

//   useEffect(() => {
//     return () => {
//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }
//     };
//   }, []);

//   const handleCopy = async () => {
//     try {
//       await navigator.clipboard.writeText(code);

//       setCopied(true);

//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }

//       timeoutRef.current = setTimeout(() => {
//         setCopied(false);
//         timeoutRef.current = null;
//       }, 1600);
//     } catch (err) {
//       console.error("Unable to copy code:", err);
//     }
//   };

//   return (
//     <div className="group/code my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#111318] text-gray-100">
//       <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
//         <span className="text-xs text-gray-400">Code</span>

//         <button
//           type="button"
//           onClick={() => void handleCopy()}
//           className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-300 transition hover:bg-white/10 hover:text-white"
//           aria-label="Copy code"
//         >
//           <Icon name={copied ? "check" : "copy"} size={14} />
//           {copied ? "Copied" : "Copy code"}
//         </button>
//       </div>

//       <pre className="max-w-full overflow-x-auto p-4 text-sm leading-6">
//         {children}
//       </pre>
//     </div>
//   );
// }

// const markdownComponents: Components = {
//   h1: ({ children }) => (
//     <h1 className="mb-4 mt-6 text-2xl font-bold tracking-tight first:mt-0">
//       {children}
//     </h1>
//   ),

//   h2: ({ children }) => (
//     <h2 className="mb-3 mt-6 text-xl font-semibold tracking-tight first:mt-0">
//       {children}
//     </h2>
//   ),

//   h3: ({ children }) => (
//     <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">
//       {children}
//     </h3>
//   ),

//   p: ({ children }) => (
//     <p className="mb-3 whitespace-pre-wrap leading-7 last:mb-0">
//       {children}
//     </p>
//   ),

//   ul: ({ children }) => (
//     <ul className="mb-4 ml-5 list-disc space-y-1.5 marker:text-current/60">
//       {children}
//     </ul>
//   ),

//   ol: ({ children }) => (
//     <ol className="mb-4 ml-5 list-decimal space-y-1.5 marker:text-current/60">
//       {children}
//     </ol>
//   ),

//   li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,

//   blockquote: ({ children }) => (
//     <blockquote className="my-4 border-l-4 border-current/30 pl-4 opacity-80">
//       {children}
//     </blockquote>
//   ),

//   hr: () => <hr className="my-5 border-current/15" />,

//   a: ({ href, children }) => (
//     <a
//       href={href}
//       target="_blank"
//       rel="noopener noreferrer"
//       className="inline-flex max-w-full items-center gap-1 break-all text-blue-500 underline underline-offset-4 hover:text-blue-400"
//     >
//       {children}
//       <Icon name="arrow-up-right" size={13} />
//     </a>
//   ),

//   code: ({ className, children, ...props }) => {
//     const isBlock = Boolean(className?.includes("language-"));

//     return (
//       <code
//         className={
//           isBlock
//             ? `${className ?? ""} text-[13px] leading-6`
//             : "rounded-md border border-current/10 bg-black/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[0.08]"
//         }
//         {...props}
//       >
//         {children}
//       </code>
//     );
//   },

//   pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,

//   table: ({ children }) => (
//     <div className="my-4 max-w-full overflow-x-auto rounded-lg border border-current/15">
//       <table className="w-full border-collapse text-left text-sm">
//         {children}
//       </table>
//     </div>
//   ),

//   thead: ({ children }) => (
//     <thead className="bg-current/[0.06]">{children}</thead>
//   ),

//   th: ({ children }) => (
//     <th className="border-b border-current/15 px-3 py-2.5 font-semibold">
//       {children}
//     </th>
//   ),

//   td: ({ children }) => (
//     <td className="border-b border-current/10 px-3 py-2.5 align-top">
//       {children}
//     </td>
//   ),
// };

// const suggestions = [
//   {
//     title: "Explain a concept",
//     description: "Learn something step by step",
//     prompt:
//       "Explain a complex concept in simple terms with practical examples.",
//     icon: "sparkles" as const,
//   },
//   {
//     title: "Debug my code",
//     description: "Find and fix a coding issue",
//     prompt:
//       "Help me debug my code. Explain the problem, show the corrected code, and tell me why the fix works.",
//     icon: "bot" as const,
//   },
//   {
//     title: "Build a project",
//     description: "Turn an idea into a working app",
//     prompt:
//       "Help me plan and build a practical full-stack web development project step by step.",
//     icon: "document" as const,
//   },
//   {
//     title: "Explore AI",
//     description: "Discover AI tools and ideas",
//     prompt:
//       "Suggest practical AI features I can build into a web application using JavaScript and Node.js.",
//     icon: "image" as const,
//   },
// ];

// export default function ChatMessages({
//   messages,
//   loading,
//   error,
//   copiedIndex,
//   onCopy,
//   onRetry,
//   onSuggestion,
// }: ChatMessagesProps) {
//   const bottomRef = useRef<HTMLDivElement>(null);
//   const scrollContainerRef = useRef<HTMLDivElement>(null);

//   const [showScrollButton, setShowScrollButton] = useState(false);

//   // Only auto-scroll when the user is already near the bottom.
//   const shouldAutoScrollRef = useRef(true);

//   useEffect(() => {
//     const container = scrollContainerRef.current;
//     if (!container) return;

//     const handleScroll = () => {
//       const distanceFromBottom =
//         container.scrollHeight -
//         container.scrollTop -
//         container.clientHeight;

//       shouldAutoScrollRef.current = distanceFromBottom < 150;
//       setShowScrollButton(distanceFromBottom > 250);
//     };

//     container.addEventListener("scroll", handleScroll, { passive: true });
//     handleScroll();

//     return () => {
//       container.removeEventListener("scroll", handleScroll);
//     };
//   }, []);

//   useEffect(() => {
//     if (!shouldAutoScrollRef.current) return;

//     bottomRef.current?.scrollIntoView({
//       behavior: loading ? "auto" : "smooth",
//       block: "end",
//     });
//   }, [messages, loading, error]);

//   const hasConversation = messages.length > 0;

//   const scrollToLatest = () => {
//     shouldAutoScrollRef.current = true;

//     bottomRef.current?.scrollIntoView({
//       behavior: "smooth",
//       block: "end",
//     });

//     setShowScrollButton(false);
//   };

//   return (
//     <div className="relative flex min-h-0 flex-1 flex-col">
//       <div
//         ref={scrollContainerRef}
//         className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
//       >
//         {!hasConversation ? (
//           <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-6">
//             <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center text-center">
//               <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-current/10 bg-current/[0.04]">
//                 <Icon name="bot" size={32} />
//               </div>

//               <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
//                 What can I help with?
//               </h1>

//               <p className="mt-3 max-w-lg text-sm leading-6 text-current/60 sm:text-base">
//                 Ask a question, explore an idea, share your code, or attach a
//                 file to get started.
//               </p>
//             </div>

//             <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//               {suggestions.map((suggestion) => (
//                 <button
//                   key={suggestion.title}
//                   type="button"
//                   onClick={() => onSuggestion(suggestion.prompt)}
//                   className="group flex min-w-0 items-start gap-3 rounded-2xl border border-current/10 bg-current/[0.025] p-4 text-left transition hover:border-current/20 hover:bg-current/[0.06]"
//                 >
//                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-current/[0.06] transition group-hover:bg-current/10">
//                     <Icon name={suggestion.icon} size={19} />
//                   </div>

//                   <div className="min-w-0 flex-1">
//                     <p className="text-sm font-semibold">{suggestion.title}</p>
//                     <p className="mt-1 text-sm leading-5 text-current/55">
//                       {suggestion.description}
//                     </p>
//                   </div>

//                   <span className="mt-1 text-current/30 transition group-hover:text-current/70">
//                     <Icon name="arrow-up-right" size={16} />
//                   </span>
//                 </button>
//               ))}
//             </div>
//           </div>
//         ) : (
//           <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
//             <div className="space-y-7 sm:space-y-9">
//               {messages.map((message, index) => {
//                 const isUser = message.role === "user";
//                 const displayContent = getDisplayContent(message);
//                 const attachments = message.attachments ?? [];

//                 return (
//                   <div
//                     key={`${index}-${message.role}`}
//                     className={`flex min-w-0 gap-3 sm:gap-4 ${
//                       isUser ? "justify-end" : "justify-start"
//                     }`}
//                   >
//                     {!isUser && (
//                       <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-current/[0.05]">
//                         <Icon name="bot" size={18} />
//                       </div>
//                     )}

//                     <div
//                       className={`min-w-0 ${
//                         isUser
//                           ? "max-w-[88%] sm:max-w-[80%]"
//                           : "max-w-full flex-1"
//                       }`}
//                     >
//                       {isUser ? (
//                         <div className="rounded-2xl rounded-br-md bg-current/[0.07] px-3.5 py-3 text-sm sm:px-5 sm:py-4 sm:text-[15px]">
//                           <AttachmentList files={attachments} />

//                           {displayContent.trim() && (
//                             <div className="whitespace-pre-wrap break-words leading-7">
//                               {displayContent}
//                             </div>
//                           )}
//                         </div>
//                       ) : (
//                         <div className="min-w-0 break-words pt-1 text-sm sm:text-[15px]">
//                           {displayContent.trim() ? (
//                             <ReactMarkdown
//                               remarkPlugins={[remarkGfm]}
//                               rehypePlugins={[rehypeHighlight]}
//                               components={markdownComponents}
//                             >
//                               {displayContent}
//                             </ReactMarkdown>
//                           ) : loading && index === messages.length - 1 ? (
//                             <div
//                               className="flex items-center gap-1.5 py-2"
//                               aria-label="AI is responding"
//                               role="status"
//                             >
//                               <span className="h-2 w-2 animate-bounce rounded-full bg-current/40 [animation-delay:-0.3s]" />
//                               <span className="h-2 w-2 animate-bounce rounded-full bg-current/40 [animation-delay:-0.15s]" />
//                               <span className="h-2 w-2 animate-bounce rounded-full bg-current/40" />
//                             </div>
//                           ) : null}
//                         </div>
//                       )}

//                       {!isUser && displayContent.trim() && (
//                         <div className="mt-3 flex items-center gap-1">
//                           <button
//                             type="button"
//                             onClick={() => onCopy(displayContent, index)}
//                             title="Copy response"
//                             aria-label="Copy response"
//                             className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-current/50 transition hover:bg-current/[0.06] hover:text-current"
//                           >
//                             <Icon
//                               name={copiedIndex === index ? "check" : "copy"}
//                               size={14}
//                             />
//                             {copiedIndex === index ? "Copied" : "Copy"}
//                           </button>

//                           {index === messages.length - 1 && !loading && (
//                             <button
//                               type="button"
//                               onClick={onRetry}
//                               disabled={loading}
//                               title="Regenerate response"
//                               aria-label="Regenerate response"
//                               className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-current/50 transition hover:bg-current/[0.06] hover:text-current disabled:cursor-not-allowed disabled:opacity-50"
//                             >
//                               <Icon name="refresh" size={14} />
//                               Retry
//                             </button>
//                           )}
//                         </div>
//                       )}
//                     </div>

//                     {isUser && (
//                       <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-current/[0.05]">
//                         <span className="text-xs font-semibold">You</span>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}

//               {loading &&
//                 messages[messages.length - 1]?.role === "user" && (
//                   <div className="flex items-start gap-3 sm:gap-4">
//                     <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-current/[0.05]">
//                       <Icon name="bot" size={18} />
//                     </div>

//                     <div
//                       className="flex items-center gap-1.5 py-3"
//                       role="status"
//                       aria-label="AI is responding"
//                     >
//                       <span className="h-2 w-2 animate-bounce rounded-full bg-current/40 [animation-delay:-0.3s]" />
//                       <span className="h-2 w-2 animate-bounce rounded-full bg-current/40 [animation-delay:-0.15s]" />
//                       <span className="h-2 w-2 animate-bounce rounded-full bg-current/40" />
//                     </div>
//                   </div>
//                 )}

//               {error && (
//                 <div
//                   className="ml-0 flex max-w-2xl items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 sm:ml-12"
//                   role="alert"
//                 >
//                   <div className="flex-1">
//                     <p className="text-sm font-semibold text-red-500">
//                       Something went wrong
//                     </p>

//                     <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-current/75">
//                       {error}
//                     </p>

//                     <button
//                       type="button"
//                       onClick={onRetry}
//                       disabled={loading}
//                       className="mt-3 inline-flex items-center gap-2 rounded-lg border border-current/10 px-3 py-2 text-sm font-medium transition hover:bg-current/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
//                     >
//                       <Icon name="refresh" size={15} />
//                       Try again
//                     </button>
//                   </div>
//                 </div>
//               )}

//               <div ref={bottomRef} className="h-1" />
//             </div>
//           </div>
//         )}
//       </div>

//       {showScrollButton && hasConversation && (
//         <button
//           type="button"
//           onClick={scrollToLatest}
//           aria-label="Scroll to latest message"
//           title="Scroll to latest message"
//           className="absolute bottom-4 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-current/15 bg-white text-gray-800 shadow-lg transition hover:scale-105 dark:bg-[#252525] dark:text-white"
//         >
//           <svg
//             width="18"
//             height="18"
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="2"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             aria-hidden="true"
//           >
//             <path d="m7 10 5 5 5-5" />
//           </svg>
//         </button>
//       )}
//     </div>
//   );
// }


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
  const type = attachment.type.toLowerCase();
  const name = attachment.name.toLowerCase();

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

function FileIcon({ kind }: { kind: ReturnType<typeof getAttachmentKind> }) {
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
    const text = String(children).replace(/\n$/, "");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to copy code:", error);
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
        >
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
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
                          {speakingIndex === index
                            ? "Stop"
                            : "Read aloud"}
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
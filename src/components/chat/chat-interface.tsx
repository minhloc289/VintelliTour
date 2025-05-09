"use client";

import type React from "react";
import { useState, useRef, useEffect, RefObject } from "react";
import { Send, Paperclip, Mic, Menu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { SidebarHandle } from "../sidebar";

type Message = {
  role: string;
  content: string;
};

type Props = {
  threadId: string | null;
  onThreadCreated: (id: string) => void;
  resetSignal: number;
  sidebarRef: RefObject<SidebarHandle | null>;
  isManualResetRef: React.MutableRefObject<boolean>;
  suppressFirstResetRef: React.MutableRefObject<boolean>;
};

export default function ChatInterface({
  threadId,
  onThreadCreated,
  resetSignal,
  sidebarRef,
  isManualResetRef,
  suppressFirstResetRef,
}: Props) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(true);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!threadId) return;

      try {
        const res = await fetch(`/api/chatbox/threads/${threadId}/state`);
        const data = await res.json();

        const historyMessages = data.messages
          .filter((msg: any) => {
            const isHuman = msg.type === "human";
            const isAiWithStringContent =
              msg.type === "ai" && typeof msg.content === "string";
            return isHuman || isAiWithStringContent;
          })
          .map((msg: any) => ({
            role: msg.type === "human" ? "user" : "ai",
            content: msg.content,
          }));

        setMessages(historyMessages);
      } catch (err) {
        console.error("Lỗi khi load lịch sử thread:", err);
        setMessages([
          {
            role: "ai",
            content: "Không thể tải lịch sử cuộc trò chuyện.",
          },
        ]);
      }
    };

    fetchHistory();
  }, [threadId, resetSignal]);

  useEffect(() => {
    setInput("");

    if (isManualResetRef.current) {
      if (suppressFirstResetRef.current) {
        suppressFirstResetRef.current = false;
      } else if (isFirstMessageRef.current) {
        // ❌ Đang sẵn sàng gửi tin nhắn đầu tiên, không reset để không mất
      } else {
        setMessages([]);
      }
    }
  }, [resetSignal]);

  const handleSend = async () => {
    if (!input.trim()) return;
    isFirstMessageRef.current = false;

    let currentThreadId: string | null = threadId;

    if (!currentThreadId) {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Chưa đăng nhập");
        return;
      }

      try {
        const res = await fetch(`/api/chatbox/${userId}/threads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { user_id: userId } }),
        });

        if (!res.ok) {
          alert("Tạo thread thất bại");
          return;
        }

        const data = await res.json();
        currentThreadId = data.thread.thread_id;

        if (currentThreadId) {
          onThreadCreated(currentThreadId); // 🔄 sẽ gọi setThreadId()

          // 🔐 Đừng setMessages() trước khi threadId cập nhật xong
          setTimeout(() => {
            setMessages([{ role: "user", content: input }]);
          }, 50);
        }
      } catch (error) {
        console.error("Error creating thread:", error);
        alert("Có lỗi khi tạo thread");
        return;
      }
    }

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

    const formattedMessages = [
      {
        lc: 1,
        type: "constructor",
        id: ["langchain_core", "messages", "HumanMessage"],
        kwargs: { content: input },
      },
    ];

    try {
      const res = await fetch("/api/chatbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedMessages,
          threadId: currentThreadId,
          userId: localStorage.getItem("userId"),
        }),
      });

      const data = await res.json();

      const aiMessages = data.messages?.map((msg: any) => ({
        role: msg.type === "human" ? "user" : "ai",
        content: msg.content,
      }));

      const latestAIMessages = aiMessages?.filter(
        (msg: { role: string }) => msg.role === "ai"
      );

      if (latestAIMessages?.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const isDuplicate =
          lastMessage?.role === "ai" &&
          lastMessage.content ===
            latestAIMessages[latestAIMessages.length - 1].content;

        if (!isDuplicate) {
          setMessages((prev) => [
            ...prev,
            latestAIMessages[latestAIMessages.length - 1],
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Không có phản hồi từ AI." },
        ]);
      }

      // ✅ Sau khi gửi và nhận được tin nhắn AI, reload Sidebar
      if (sidebarRef.current) {
        sidebarRef.current.reloadThreads();
      }
    } catch (error) {
      console.error("Error during chat request:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "40px";
      textAreaRef.current.style.height = `${Math.min(
        textAreaRef.current.scrollHeight,
        100
      )}px`;
    }
  }, [input]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-[98%] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-600 to-teal-500 flex items-center rounded-t-xl">
        <div className="lg:hidden mr-2">
          <button className="w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white">
            <Menu size={16} />
          </button>
        </div>
        <div className="w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center text-white shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <div className="ml-4">
          <h2 className="text-xl font-serif tracking-wide text-white font-bold">
            Khám phá Việt Nam
          </h2>
          <p className="text-xs text-teal-50 font-sans">
            Hỏi đáp cùng trợ lý du lịch của bạn
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
        style={{
          height: "calc(100vh - 240px)",
          maxHeight: "500px",
        }}
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6 shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </div>
              <p className="text-center max-w-xs font-medium text-gray-500">
                Chào mừng bạn đến với VintelliTour. Hãy đặt câu hỏi về du lịch
                Việt Nam!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role !== "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full mr-2 overflow-hidden bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100"
                  }`}
                >
                  <div className="prose prose-sm max-w-none text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center text-white ml-2 shadow-md">
                    <span className="text-xs font-bold">YOU</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center bg-gray-50 rounded-full p-1 shadow-sm border border-gray-200">
          <textarea
            className="flex-1 px-3 py-2 bg-transparent border-none resize-none text-gray-700 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Bạn muốn đi đâu hôm nay?"
            rows={1}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className={`p-2.5 rounded-full ${
              input.trim() && !isSending
                ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSending && (
              <div className="flex justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full mr-2 overflow-hidden bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  AI
                </div>
                <div className="flex items-center gap-2 max-w-[80%] bg-white text-gray-500 text-sm border border-gray-100 shadow-sm px-4 py-2 rounded-2xl font-medium">
                  <svg
                    className="animate-spin h-4 w-4 text-teal-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Đang nhập...</span>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

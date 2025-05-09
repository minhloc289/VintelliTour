"use client";

import Sidebar, { SidebarHandle } from "../../components/sidebar";
import ChatInterface from "../../components/chat/chat-interface";
import MapSection from "../../components/map-section";
import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const isManualResetRef = useRef(true);
  const suppressFirstResetRef = useRef(false);
  const sidebarRef = useRef<SidebarHandle>(null);
  const isCreatingThreadRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => setIsMobile(window.innerWidth < 1024);
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    const savedThreadId = localStorage.getItem("selectedThreadId");
    if (savedThreadId) {
      suppressFirstResetRef.current = true;
      setThreadId(savedThreadId);
    }
  }, []);

  // ✅ Khi người dùng chủ động bấm "Cuộc trò chuyện mới"
  const handleNewThread = () => {
    isManualResetRef.current = true; // ✅ đánh dấu thủ công
    isCreatingThreadRef.current = true;
    setThreadId(null);
    setResetSignal((prev) => prev + 1);
    localStorage.removeItem("selectedThreadId");
  };

  const handleSelectThread = (selectedThreadId: string) => {
    setThreadId(selectedThreadId);
    setResetSignal((prev) => prev + 1);
    localStorage.setItem("selectedThreadId", selectedThreadId);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[92vh] mt-[14px] p-2 gap-2">
      {/* SIDEBAR */}
      <section
        className={`${
          isMobile ? "hidden" : "block"
        } w-full lg:w-[220px] xl:w-[250px] h-[calc(100vh-72px)]`}
      >
        <Sidebar
          ref={sidebarRef}
          onNewThread={handleNewThread}
          onSelectThread={handleSelectThread}
          selectedThreadId={threadId}
        />
      </section>

      {/* CHAT INTERFACE */}
      <section className="flex-1 min-w-0 h-[calc(100vh-72px)]">
        <ChatInterface
          threadId={threadId}
          onThreadCreated={(newThreadId: string) => {
            setThreadId(newThreadId);

            // ✅ Chỉ reset nếu không phải suppress và không phải vừa tạo thread thủ công
            if (
              !suppressFirstResetRef.current &&
              !isCreatingThreadRef.current
            ) {
              setResetSignal((prev) => prev + 1);
            }

            suppressFirstResetRef.current = false;
            isCreatingThreadRef.current = false; // ✅ reset lại cờ
            localStorage.setItem("selectedThreadId", newThreadId);
            isManualResetRef.current = false;
          }}
          resetSignal={resetSignal}
          sidebarRef={sidebarRef}
          isManualResetRef={isManualResetRef}
          suppressFirstResetRef={suppressFirstResetRef}
        />
      </section>

      {/* MAP SECTION */}
      <section className="w-full lg:w-[320px] xl:w-[380px] h-[300px] lg:h-[calc(100vh-72px)] mt-2 lg:mt-0">
        <MapSection />
      </section>
    </div>
  );
}

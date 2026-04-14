"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

type Message = {
  id: number;
  text: string;
  sender: "bot" | "user";
  isTyping?: boolean;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: Date.now(), text: "System online. How can Vector AI assist with your lead flow?", sender: "bot" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    const txt = inputValue.trim();
    if (!txt) return;

    // Add user message
    const userMsg: Message = { id: Date.now(), text: txt, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Add typing indicator
    const typingId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: typingId, text: "", sender: "bot", isTyping: true }]);

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => {
        // remove typing indicator
        const filtered = prev.filter((m) => m.id !== typingId);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            text: "Processing natural language query... Lead qualification parameters updated.",
            sender: "bot"
          }
        ];
      });
    }, 1500);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div id="ai-chat">
      <button className="chat-toggle" onClick={toggleChat}>
        {isOpen ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="none">
            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.54 1.45 4.81 3.73 6.26C5.2 18.06 4 21 4 21s3.78-1.58 5.75-2.73C10.49 18.1 11.23 18 12 18c5.52 0 10-3.58 10-8s-4.48-8-10-8z"></path>
          </svg>
        )}
      </button>

      <div className={`chat-box ${isOpen ? "open" : ""}`}>
        <div className="chat-header">
          <div className="chat-av">V</div>
          <div>
            <div className="chat-hname">VECTOR AI</div>
            <div className="chat-hstatus">ONLINE &amp; READY</div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((m) => {
            if (m.isTyping) {
              return (
                <div key={m.id} className="typing">
                  <span></span><span></span><span></span>
                </div>
              );
            }
            return (
              <div key={m.id} className={`msg ${m.sender}`}>
                {m.text}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            className="chat-input"
            placeholder="Command Vector AI..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="chat-send" onClick={handleSend}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

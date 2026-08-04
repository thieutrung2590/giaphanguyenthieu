'use client';

import React, { useState, useRef, useEffect } from 'react';

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedChat = localStorage.getItem('giapha_chat_history');
    if (savedChat) {
      try {
        setChatHistory(JSON.parse(savedChat));
      } catch (error) {
        console.error('Lỗi khi đọc lịch sử chat:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('giapha_chat_history', JSON.stringify(chatHistory));
    } else {
      localStorage.removeItem('giapha_chat_history');
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg = message;
    setMessage('');
    setChatHistory((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      // Kiểm tra xem phản hồi có phải là JSON không (Đề phòng bị Middleware chuyển hướng ra trang HTML)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Bị chặn truy cập. Có thể do Middleware yêu cầu đăng nhập.");
      }

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.reply || 'Máy chủ trả về lỗi không xác định.');
      }

      setChatHistory((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch (error: any) {
      // Đã sửa: In thẳng lỗi thật ra màn hình để biết chính xác hệ thống đang vướng ở đâu
      setChatHistory((prev) => [
        ...prev,
        { role: 'bot', text: `Chi tiết lỗi: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?')) {
      setChatHistory([]);
      localStorage.removeItem('giapha_chat_history');
    }
  };

  return (
    <div className="fixed bottom-[100px] right-6 z-50 font-sans">
      {isOpen ? (
        <div className="bg-[#fcfaf8] rounded-xl shadow-2xl w-[350px] h-[500px] flex flex-col border border-amber-200 overflow-hidden">
          <div className="bg-amber-700 text-white p-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-sm tracking-wide">Trợ lý Gia Phả</h3>
            </div>
            <div className="flex items-center gap-3">
              {chatHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-amber-200 hover:text-white transition-colors text-xs font-medium"
                  title="Xóa lịch sử"
                >
                  Xóa
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-[#faf8f5] flex flex-col gap-3">
            {chatHistory.length === 0 && (
              <div className="text-center text-amber-700/70 text-xs mt-4">
                Xin chào! Tôi có thể giúp bạn tìm kiếm thông tin về các thành viên trong gia phả.
              </div>
            )}
            
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  chat.role === 'user'
                    ? 'bg-amber-600 text-white self-end rounded-tr-sm shadow-md'
                    : 'bg-white text-stone-800 self-start border border-amber-100 shadow-sm rounded-tl-sm'
                }`}
              >
                {chat.text}
              </div>
            ))}
            
            {isLoading && (
              <div className="bg-white text-stone-800 self-start max-w-[85%] rounded-2xl rounded-tl-sm p-3 border border-amber-100 shadow-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-200"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-amber-100 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-amber-50/50 text-stone-800 rounded-full px-4 py-2 text-sm border border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600/50 transition-all placeholder-amber-700/40"
              placeholder="Hỏi về thành viên..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !message.trim()}
              className="bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-amber-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:bg-amber-800 transition-transform transform hover:-translate-y-1 border-2 border-white/20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

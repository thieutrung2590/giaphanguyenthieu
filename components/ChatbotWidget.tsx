'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase client để kiểm tra trạng thái đăng nhập
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ChatMessage = {
  role: 'user' | 'bot';
  text: string;
};

export default function ChatbotWidget() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Kiểm tra trạng thái đăng nhập của người dùng
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    
    checkAuth();

    // Lắng nghe sự kiện đăng nhập/đăng xuất để cập nhật widget ngay lập tức
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      // Nếu đăng xuất thì tự động đóng cửa sổ chat
      if (!session) setIsOpen(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.reply || 'Có lỗi xảy ra');

      setChatHistory((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch (error: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'bot', text: 'Lỗi kết nối đến máy chủ. Vui lòng thử lại.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // NẾU CHƯA ĐĂNG NHẬP -> KHÔNG HIỂN THỊ GÌ CẢ
  if (!isAuthenticated) {
    return null;
  }

  // ĐÃ ĐĂNG NHẬP -> HIỂN THỊ WIDGET (Đã dời vị trí lên bottom-[100px] để tránh đè Zalo)
  return (
    <div className="fixed bottom-[100px] right-6 z-50 font-sans">
      {isOpen ? (
        <div className="bg-white rounded-xl shadow-2xl w-[350px] h-[500px] flex flex-col border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-sm">Trợ lý Gia Phả</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body / Chat History */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
            {chatHistory.length === 0 && (
              <div className="text-center text-slate-500 text-xs mt-4">
                Xin chào! Tôi có thể giúp bạn tìm kiếm thông tin về các thành viên trong gia phả.
              </div>
            )}
            
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  chat.role === 'user'
                    ? 'bg-blue-600 text-white self-end rounded-tr-sm'
                    : 'bg-white text-slate-800 self-start border border-gray-100 shadow-sm rounded-tl-sm'
                }`}
              >
                {chat.text}
              </div>
            ))}
            
            {isLoading && (
              <div className="bg-white text-slate-800 self-start max-w-[85%] rounded-2xl rounded-tl-sm p-3 border border-gray-100 shadow-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer / Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-100 text-slate-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Hỏi về thành viên..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          className="bg-slate-800 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-slate-700 transition-transform transform hover:-translate-y-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

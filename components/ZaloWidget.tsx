// components/ZaloWidget.tsx
import Link from "next/link";

export default function ZaloWidget() {
  // Thay thế bằng link nhóm Zalo thực tế của dòng họ
  const zaloGroupLink = "https://zalo.me/g/plybyq260"; 

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip gợi ý (Tùy chọn, ẩn trên mobile) */}
      <span className="hidden md:block bg-white text-gray-700 text-sm px-3 py-1.5 rounded-lg shadow-md border border-gray-100 animate-fade-in">
        Tham gia nhóm Zalo
      </span>

      <Link
        href={zaloGroupLink}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-center justify-center w-14 h-14 bg-[#0068FF] rounded-full shadow-lg hover:scale-110 transition-transform duration-300 group"
      >
        {/* Hiệu ứng sóng tỏa ra xung quanh */}
        <span className="absolute inset-0 rounded-full bg-[#0068FF] animate-ping opacity-60 group-hover:hidden"></span>
        
        {/* Text Zalo hiển thị ở giữa */}
        <span className="relative text-white font-bold text-lg select-none">
          Zalo
        </span>
      </Link>
    </div>
  );
}

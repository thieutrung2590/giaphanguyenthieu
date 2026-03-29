import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
      
      {/* 1. Phần Tiêu đề giả */}
      <div>
        <div className="h-10 bg-stone-200 rounded-xl w-64 mb-4"></div>
        <div className="h-4 bg-stone-100 rounded-lg w-full max-w-2xl mb-2"></div>
        <div className="h-4 bg-stone-100 rounded-lg w-3/4 max-w-xl"></div>
      </div>

      {/* 2. Phần Nút bấm giả */}
      <div className="flex gap-4">
        <div className="h-12 bg-stone-200 rounded-2xl w-48"></div>
        <div className="h-12 bg-stone-200 rounded-2xl w-48 hidden sm:block"></div>
      </div>

      {/* 3. Phần Bảng dữ liệu giả (Hiển thị 5 dòng nhấp nháy) */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="h-14 bg-stone-50 border-b border-stone-200"></div>
        
        <div className="divide-y divide-stone-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center p-6 gap-6">
              {/* Cột tên */}
              <div className="flex items-center gap-3 w-1/3">
                <div className="size-10 bg-stone-200 rounded-full shrink-0"></div>
                <div className="h-5 bg-stone-200 rounded-lg w-full max-w-[150px]"></div>
              </div>
              
              {/* Cột thông tin 1 */}
              <div className="w-1/4 flex justify-center">
                <div className="h-5 bg-stone-100 rounded-lg w-16"></div>
              </div>
              
              {/* Cột thông tin 2 */}
              <div className="w-1/4 flex justify-center">
                <div className="h-5 bg-stone-100 rounded-lg w-16"></div>
              </div>

              {/* Cột trạng thái */}
              <div className="w-1/6 flex justify-end">
                <div className="h-6 bg-stone-200 rounded-full w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Biểu tượng loading xoay ở giữa màn hình */}
      <div className="flex justify-center pt-4">
        <div className="flex items-center gap-2 text-stone-400 font-medium">
          <Loader2 className="size-5 animate-spin" />
          <span>Đang tải dữ liệu gia phả...</span>
        </div>
      </div>
      
    </div>
  );
}

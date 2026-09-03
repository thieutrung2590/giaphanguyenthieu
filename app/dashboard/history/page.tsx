import { getSupabase, getIsAdmin } from "@/utils/supabase/queries";
import { History, AlertCircle, ArrowRight, ArrowLeft, Calendar } from "lucide-react";
import { AddHistoryForm, EditHistoryModal, DeleteHistoryButton } from "./ClientActions";
import Link from "next/link";

export const metadata = {
  title: "Lịch sử dòng họ",
};

function safeFormatDate(dateStr: string | null) {
  if (!dateStr) return "";
  try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
  } catch {
      return dateStr;
  }
}

export default async function HistoryPage() {
  const supabase = await getSupabase();
  const isAdmin = await getIsAdmin(); 

  const { data: histories, error } = await supabase
    .from("family_history")
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false });

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        
        <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-amber-600 transition-colors mb-6 bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm w-fit"
        >
          <ArrowLeft className="size-4" />
          Quay lại Bảng điều khiển
        </Link>

        <h1 className="title flex items-center gap-3">
          <History className="size-8 text-amber-600" />
          Lịch sử dòng họ
        </h1>
        <p className="text-stone-500 mt-1 text-sm">
          Ghi chép lại những cột mốc và sự kiện quan trọng của dòng họ.
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 space-y-8">
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-200">
            <AlertCircle className="size-5" />
            <p className="text-sm font-medium">Không thể tải dữ liệu lịch sử lúc này. Vui lòng thử lại sau.</p>
          </div>
        )}
        
        {isAdmin && <AddHistoryForm />}

        {!error && (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-amber-400 before:via-stone-200 before:to-stone-100">
            {histories?.map((item) => {
              // Lấy đoạn trích ngắn nội dung (loại bỏ markdown ảnh để nhìn sạch đẹp)
              const cleanSnippet = item.content
                ? item.content.replace(/!\[.*?\]\(.*?\)/g, '[Hình ảnh]').replace(/\n+/g, ' ').trim().slice(0, 150)
                : '';

              return (
                <div key={item.id} className="relative group">
                  {/* Nút tròn mốc thời gian trên trục dọc */}
                  <div className="absolute -left-[1.95rem] sm:-left-[2.45rem] top-5 flex items-center justify-center w-5 sm:w-6 h-5 sm:h-6 rounded-full border-2 border-white bg-amber-500 text-white shadow-sm z-10 transition-transform group-hover:scale-110">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>

                  {/* Thẻ bài viết toàn chiều rộng, hiển thị trọn vẹn tiêu đề */}
                  <div className="w-full bg-white border border-stone-200/70 p-5 sm:p-6 rounded-2xl shadow-xs hover:shadow-md hover:border-amber-300 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      {item.event_date ? (
                        <time className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">
                          <Calendar className="size-3.5" />
                          {safeFormatDate(item.event_date)}
                        </time>
                      ) : (
                        <span className="text-xs text-stone-400 italic">Chưa xác định ngày</span>
                      )}
                      
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <EditHistoryModal item={item} />
                          <DeleteHistoryButton id={item.id} />
                        </div>
                      )}
                    </div>

                    <Link href={`/dashboard/history/${item.id}`} className="block group/title">
                      {/* Tiêu đề hiển thị đầy đủ 100%, không bị cắt chữ */}
                      <h3 className="text-base sm:text-lg font-bold text-stone-800 group-hover/title:text-amber-700 transition-colors leading-snug break-words">
                        {item.title}
                      </h3>

                      {cleanSnippet && (
                        <p className="mt-2 text-sm text-stone-500 leading-relaxed line-clamp-2">
                          {cleanSnippet}...
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-amber-600 group-hover/title:translate-x-1 transition-transform">
                        <span>Đọc bài viết</span>
                        <ArrowRight className="size-3.5" />
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}

            {(!histories || histories.length === 0) && (
              <p className="text-center text-stone-400 text-sm py-10 relative z-20 bg-stone-50/80 rounded-2xl border border-dashed border-stone-200">
                Chưa có sự kiện lịch sử nào được ghi lại.
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

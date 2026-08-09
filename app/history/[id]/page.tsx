import { getSupabase } from "@/utils/supabase/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

function safeFormatDate(dateStr: string | null) {
  if (!dateStr) return "";
  try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
  } catch {
      return dateStr;
  }
}

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const supabase = await getSupabase();
  
  // Lấy chi tiết 1 bài viết dựa trên ID từ URL
  const { data: history, error } = await supabase
    .from("family_history")
    .select("*")
    .eq("id", params.id)
    .single();

  // Nếu ID không tồn tại hoặc lỗi, tự động chuyển về trang 404
  if (error || !history) {
    notFound();
  }

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12 bg-stone-50/30 min-h-screen">
      <main className="w-full relative z-20 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        
        {/* Nút Quay lại */}
        <Link 
            href="/history" 
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-amber-600 transition-colors mb-8 bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm"
        >
          <ArrowLeft className="size-4" />
          Quay lại lịch sử
        </Link>
        
        <article className="bg-white border border-stone-200/60 p-6 sm:p-10 rounded-3xl shadow-sm">
            {/* Tiêu đề */}
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4 leading-snug">
              {history.title}
            </h1>
            
            {/* Thời gian */}
            {history.event_date && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-8 pb-6 border-b border-stone-100 font-medium">
                <Calendar className="size-4" />
                <time>{safeFormatDate(history.event_date)}</time>
              </div>
            )}

            {/* Nội dung bài viết */}
            <div className="prose prose-stone prose-amber max-w-none text-stone-700 whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base">
              {history.content}
            </div>
        </article>

      </main>
    </div>
  );
}

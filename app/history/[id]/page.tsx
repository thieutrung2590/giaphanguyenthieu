import { getSupabase } from "@/utils/supabase/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

// Format ngày an toàn, tránh lỗi timezone
function safeFormatDate(dateStr: string | null) {
  if (!dateStr) return "";

  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return dateStr;
  }

  return `${day}/${month}/${year}`;
}

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await getSupabase();

  // Lấy chi tiết bài viết theo ID
  const { data: history, error } = await supabase
    .from("family_history")
    .select("*")
    .eq("id", id)
    .single();

  // Không tìm thấy bài viết hoặc có lỗi
  if (error || !history) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <main>
        {/* Nút quay lại */}
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
              <time dateTime={history.event_date}>
                {safeFormatDate(history.event_date)}
              </time>
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
```

import { getSupabase, getIsAdmin } from "@/utils/supabase/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import HistoryContentRenderer from "../HistoryContentRenderer";
import { EditHistoryModal, DeleteHistoryButton } from "../ClientActions";

const safeFormatDate = (d: string | null) => d ? d.split('T')[0].split('-').reverse().join('/') : "";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HistoryDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const supabase = await getSupabase();
  const isAdmin = await getIsAdmin();
  
  const { data: history, error } = await supabase
    .from("family_history")
    .select("id, title, content, event_date")
    .eq("id", id)
    .single();

  if (error || !history) {
    notFound();
  }

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12 bg-stone-50/30 min-h-screen">
      <main className="w-full relative z-20 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <Link 
              href="/dashboard/history" 
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-amber-600 transition-colors bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm"
          >
            <ArrowLeft className="size-4" />
            Quay lại lịch sử
          </Link>

          {isAdmin && (
            <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-sm">
              <span className="text-xs text-stone-400 font-medium mr-0.5">Quản trị:</span>
              <EditHistoryModal 
                item={history} 
                triggerLabel="Sửa bài"
                triggerClassName="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors" 
              />
              <DeleteHistoryButton 
                id={history.id} 
                triggerClassName="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" 
              />
            </div>
          )}
        </div>
        
        <article className="bg-white border border-stone-200/60 p-6 sm:p-10 rounded-3xl shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4 leading-snug break-words">
              {history.title}
            </h1>
            
            {history.event_date && (
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-8 pb-6 border-b border-stone-100 font-medium">
                <Calendar className="size-4" />
                <time>{safeFormatDate(history.event_date)}</time>
              </div>
            )}

            <HistoryContentRenderer content={history.content} />
        </article>

      </main>
    </div>
  );
}

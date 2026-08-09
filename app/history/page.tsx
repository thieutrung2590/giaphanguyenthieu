import { getSupabase, getIsAdmin } from "@/utils/supabase/queries"; // <-- Import getIsAdmin của bạn
import { History, AlertCircle } from "lucide-react";
import { AddHistoryForm, DeleteHistoryButton } from "./ClientActions";

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
  
  // SỬ DỤNG HÀM PHÂN QUYỀN SUPABASE CÓ SẴN CỦA BẠN
  const isAdmin = await getIsAdmin(); 

  const { data: histories, error } = await supabase
    .from("family_history")
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false });

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
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
        
        {/* Nếu getIsAdmin() trả về true, form này sẽ lập tức hiện ra */}
        {isAdmin && <AddHistoryForm />}

        {!error && (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
            {histories?.map((item) => (
              <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-stone-100 text-stone-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                </div>

                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-stone-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      {item.event_date && (
                        <time className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                          {safeFormatDate(item.event_date)}
                        </time>
                      )}
                      <h3 className="text-base font-bold text-stone-800 mt-1">{item.title}</h3>
                    </div>
                    
                    {isAdmin && <DeleteHistoryButton id={item.id} />}
                  </div>
                  
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}

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

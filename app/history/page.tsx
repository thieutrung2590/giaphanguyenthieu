import { getSupabase } from "@/utils/supabase/queries";
import { addHistoryEntry, deleteHistoryEntry } from "@/app/actions/historyActions";
import { Trash2, CalendarPlus, History } from "lucide-react";

export const metadata = {
  title: "Lịch sử dòng họ",
};

export default async function HistoryPage() {
  const supabase = await getSupabase();
  
  // 1. Fetch dữ liệu lịch sử
  const { data: histories } = await supabase
    .from("family_history")
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false });

  // 2. Kiểm tra quyền Admin (Thay bằng logic thật của bạn)
  const { data: { user } } = await supabase.auth.getUser();
  // const isAdmin = user?.email === 'admin@netvn.net'; 
  const isAdmin = true; // Chỉnh sửa lại logic này

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
        
        {/* KHU VỰC THÊM MỚI (CHỈ ADMIN MỚI THẤY) */}
        {isAdmin && (
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-4">
              <CalendarPlus className="size-4" />
              Thêm mốc lịch sử mới (Khu vực Admin)
            </h2>
            <form action={addHistoryEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Tiêu đề sự kiện (VD: Lễ khánh thành nhà thờ họ)"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="date"
                  name="event_date"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-600"
                />
              </div>
              <textarea
                name="content"
                required
                rows={3}
                placeholder="Nội dung chi tiết..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400 resize-none"
              ></textarea>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
              >
                Đăng bài viết
              </button>
            </form>
          </div>
        )}

        {/* DANH SÁCH LỊCH SỬ (AI CŨNG THẤY) */}
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
          {histories?.map((item) => (
            <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              {/* Icon Marker */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-stone-100 text-stone-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              </div>

              {/* Card Lịch sử */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-stone-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    {item.event_date && (
                      <time className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                        {new Date(item.event_date).toLocaleDateString("vi-VN")}
                      </time>
                    )}
                    <h3 className="text-base font-bold text-stone-800 mt-1">{item.title}</h3>
                  </div>
                  
                  {/* NÚT XÓA (CHỈ ADMIN MỚI THẤY) */}
                  {isAdmin && (
                    <form action={deleteHistoryEntry.bind(null, item.id)}>
                      <button 
                        type="submit" 
                        title="Xóa bài viết"
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  )}
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

      </main>
    </div>
  );
}

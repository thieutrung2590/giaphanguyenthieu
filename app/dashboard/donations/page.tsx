import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import { HeartHandshake, TrendingDown, Wallet, History, Receipt } from "lucide-react";
import DonationForm from "./DonationForm";
import ExpenseForm from "./ExpenseForm";

export default async function DonationsPage() {
  const isAdmin = await getIsAdmin();
  const supabase = await getSupabase();

  // 1. Lấy dữ liệu Thu và Chi đồng thời
  const [{ data: donations }, { data: expenses }] = await Promise.all([
    supabase.from("donations").select("*").order("donation_date", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false })
  ]);

  // 2. Tính toán con số thống kê
  const totalDonated = donations?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const totalSpent = expenses?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const balance = totalDonated - totalSpent;

  const formatVND = (amount: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
      
      {/* ── TIÊU ĐỀ & MÔ TẢ ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
              <Wallet className="size-8 text-rose-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Công đức Dòng họ
            </h1>
          </div>
          <p className="text-stone-500 text-lg max-w-2xl font-light leading-relaxed">
            Ghi nhận những đóng góp của các thành viên gia tộc để thực hiện các công việc chung.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <DonationForm />
            <ExpenseForm />
          </div>
        )}
      </div>

      {/* ── CÁC THẺ THỐNG KÊ ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-stone-500 text-sm font-medium flex items-center gap-2 mb-2">
            <HeartHandshake className="size-4 text-emerald-500" /> Tổng thu (Công đức)
          </p>
          <p className="text-2xl font-bold text-emerald-600 tracking-tight">{formatVND(totalDonated)}</p>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-stone-500 text-sm font-medium flex items-center gap-2 mb-2">
            <TrendingDown className="size-4 text-rose-500" /> Tổng đã chi
          </p>
          <p className="text-2xl font-bold text-rose-600 tracking-tight">{formatVND(totalSpent)}</p>
        </div>

        <div className="bg-rose-600 p-6 rounded-3xl shadow-lg shadow-rose-200/50">
          <p className="text-rose-100 text-sm font-medium mb-2">Số dư còn lại (Quỹ)</p>
          <p className="text-2xl font-bold text-white tracking-tight">{formatVND(balance)}</p>
        </div>
      </div>

      {/* ── LỊCH SỬ THU CHI ────────────────────────────────────────── */}
      <div className="space-y-10">
        
        {/* BẢNG THU */}
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
            <HeartHandshake className="size-5 text-emerald-600" /> Danh sách Công đức
          </h2>
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ngày</th>
                  <th className="px-6 py-4 font-semibold">Người công đức</th>
                  <th className="px-6 py-4 font-semibold text-right">Số tiền</th>
                  <th className="px-6 py-4 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donations?.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-4 text-stone-500">{new Date(item.donation_date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 font-bold text-stone-800">{item.donor_name}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatVND(item.amount)}</td>
                    <td className="px-6 py-4 text-stone-500">{item.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* BẢNG CHI */}
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
            <Receipt className="size-5 text-rose-600" /> Danh sách Chi tiêu
          </h2>
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ngày chi</th>
                  <th className="px-6 py-4 font-semibold">Nội dung chi</th>
                  <th className="px-6 py-4 font-semibold text-right">Số tiền</th>
                  <th className="px-6 py-4 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses?.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-4 text-stone-500">{new Date(item.expense_date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 font-bold text-stone-800">{item.description}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">{formatVND(item.amount)}</td>
                    <td className="px-6 py-4 text-stone-500">{item.note || "-"}</td>
                  </tr>
                ))}
                {(!expenses || expenses.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-stone-400">Chưa có dữ liệu chi tiêu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        
      </div>
    </main>
  );
}

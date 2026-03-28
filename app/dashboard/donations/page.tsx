// app/dashboard/donations/page.tsx
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import { HeartHandshake, TrendingDown, Wallet } from "lucide-react";
import DonationForm from "./DonationForm";
import ExpenseForm from "./ExpenseForm"; // Bạn sẽ tạo file này tương tự DonationForm

export default async function DonationsPage() {
  const isAdmin = await getIsAdmin();
  const supabase = await getSupabase();

  // 1. Lấy dữ liệu Thu và Chi
  const [{ data: donations }, { data: expenses }] = await Promise.all([
    supabase.from("donations").select("*").order("donation_date", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false })
  ]);

  // 2. Tính toán con số
  const totalDonated = donations?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const totalSpent = expenses?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const balance = totalDonated - totalSpent;

  const formatVND = (amount: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  return (
    <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3">
          <Wallet className="size-8 text-rose-600" /> Quản lý Quỹ Dòng Họ
        </h1>
        {isAdmin && (
          <div className="flex gap-3">
            <DonationForm />
            <ExpenseForm /> {/* Nút Thêm phiếu chi */}
          </div>
        )}
      </div>

      {/* 3 Thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm">
          <p className="text-stone-500 text-sm font-medium flex items-center gap-2">
            <HeartHandshake className="size-4 text-emerald-500" /> Tổng công đức (Thu)
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatVND(totalDonated)}</p>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm">
          <p className="text-stone-500 text-sm font-medium flex items-center gap-2">
            <TrendingDown className="size-4 text-rose-500" /> Tổng đã chi
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-2">{formatVND(totalSpent)}</p>
        </div>

        <div className="bg-rose-600 p-6 rounded-3xl shadow-lg shadow-rose-200">
          <p className="text-rose-100 text-sm font-medium">Số dư còn lại</p>
          <p className="text-2xl font-bold text-white mt-2">{formatVND(balance)}</p>
        </div>
      </div>

      {/* Bạn có thể dùng Tab để chuyển đổi giữa bảng THU và bảng CHI ở đây */}
      <div className="space-y-4">
         <h2 className="text-xl font-bold text-stone-800">Lịch sử thu chi gần đây</h2>
         {/* ... Render bảng dữ liệu tương tự như trước ... */}
      </div>
    </main>
  );
}

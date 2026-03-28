"use client";

import { Minus, X } from "lucide-react";
import { useState } from "react";
import { addExpense } from "./actions";

export default function ExpenseForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await addExpense(formData);
    setIsSubmitting(false);
    if (!result.error) setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl hover:bg-stone-900 transition-colors shadow-sm font-medium"
      >
        <Minus className="size-5" />
        Thêm khoản chi
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-stone-100">
              <h3 className="text-xl font-bold text-stone-800 font-serif">Lập phiếu chi</h3>
              <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-rose-600 transition-colors">
                <X className="size-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nội dung chi *</label>
                <input required type="text" name="description" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 outline-none transition-all" placeholder="VD: Sửa mái nhà thờ" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Số tiền chi (VNĐ) *</label>
                <input required type="number" name="amount" min="1000" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Ngày chi *</label>
                <input required type="date" name="expense_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 outline-none transition-all" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-medium transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-medium transition-colors disabled:opacity-50">
                  {isSubmitting ? "Đang lưu..." : "Lưu phiếu chi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, CalendarPlus } from "lucide-react";
import { addHistoryEntry, deleteHistoryEntry } from "@/app/actions/historyActions";

// Nút submit có hiệu ứng Loading
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-xl transition-colors flex items-center gap-2"
    >
      {pending ? "Đang đăng..." : "Đăng bài viết"}
    </button>
  );
}

// Component Form Thêm mới
export function AddHistoryForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const handleAction = async (formData: FormData) => {
    try {
      await addHistoryEntry(formData);
      formRef.current?.reset(); // Xóa trắng form sau khi thành công
    } catch (error: any) {
      alert(error.message || "Đã xảy ra lỗi khi thêm sự kiện.");
    }
  };

  return (
    <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-4">
        <CalendarPlus className="size-4" />
        Thêm mốc lịch sử mới (Khu vực Admin)
      </h2>
      <form ref={formRef} action={handleAction} className="space-y-4">
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
        <SubmitButton />
      </form>
    </div>
  );
}

// Component Nút Xóa có Xác nhận
export function DeleteHistoryButton({ id }: { id: string }) {
  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa mốc lịch sử này không? Hành động này không thể hoàn tác.")) {
      try {
        await deleteHistoryEntry(id);
      } catch (error: any) {
        alert(error.message || "Đã xảy ra lỗi khi xóa.");
      }
    }
  };

  return (
    <button 
      onClick={handleDelete}
      title="Xóa bài viết"
      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

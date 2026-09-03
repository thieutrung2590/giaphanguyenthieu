'use client';

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, CalendarPlus, ImagePlus, Eye, Edit3, Loader2, Sparkles } from "lucide-react";
import imageCompression from "browser-image-compression";
import { addHistoryEntry, deleteHistoryEntry, uploadHistoryImageAction } from "@/app/actions/historyActions";
import HistoryContentRenderer from "./HistoryContentRenderer";

// Nút submit có hiệu ứng Loading
function SubmitButton({ isUploading }: { isUploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || isUploading}
      className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Đang đăng...
        </>
      ) : (
        "Đăng bài viết"
      )}
    </button>
  );
}

// Component Form Thêm mới với tính năng Paste ảnh & Nén ảnh từ trình duyệt
export function AddHistoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Hàm nén ảnh từ trình duyệt và upload lên server
  const processAndUploadImage = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Vui lòng chọn một file hình ảnh hợp lệ.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Đang nén ảnh tối ưu...");

    try {
      // 1. Nén ảnh trực tiếp trên trình duyệt của người dùng
      const options = {
        maxSizeMB: 1, // Tối đa 1MB
        maxWidthOrHeight: 1920, // Độ phân giải tối đa Full HD
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      setUploadStatus("Đang tải ảnh lên máy chủ...");

      // 2. Gửi ảnh đã nén lên Vercel Blob qua Server Action
      const formData = new FormData();
      formData.append("file", compressedFile, file.name || "pasted-image.jpg");

      const result = await uploadHistoryImageAction(formData);

      if (result.success && result.url) {
        // 3. Chèn cú pháp markdown ![Hình ảnh](url) vào đúng vị trí con trỏ chuột
        const markdownImage = `\n![Hình ảnh](${result.url})\n`;
        const textarea = textareaRef.current;

        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentVal = textarea.value;
          const newVal = currentVal.substring(0, start) + markdownImage + currentVal.substring(end);

          setContent(newVal);

          // Cập nhật lại vị trí con trỏ sau khi chèn
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length);
          }, 50);
        } else {
          setContent((prev) => prev + markdownImage);
        }

        setUploadStatus("Chèn ảnh thành công!");
        setTimeout(() => setUploadStatus(""), 2500);
      } else {
        alert(result.error || "Không thể tải ảnh lên kho lưu trữ.");
        setUploadStatus("");
      }
    } catch (error) {
      console.error("Lỗi khi xử lý ảnh:", error);
      alert("Đã xảy ra lỗi trong quá trình nén và tải ảnh lên.");
      setUploadStatus("");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Bắt sự kiện Paste (Ctrl + V) trên ô textarea
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault(); // Ngăn paste ký tự lạ
        const file = item.getAsFile();
        if (file) {
          processAndUploadImage(file);
        }
        break;
      }
    }
  };

  // Bắt sự kiện kéo thả (Drag & Drop) ảnh vào ô textarea
  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        processAndUploadImage(file);
      }
    }
  };

  // Xử lý chọn file từ nút bấm
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadImage(file);
    }
  };

  const handleAction = async (formData: FormData) => {
    try {
      formData.set("content", content); // Đảm bảo lấy đúng nội dung từ state
      await addHistoryEntry(formData);
      formRef.current?.reset();
      setContent("");
      setActiveTab("edit");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Đã xảy ra lỗi khi thêm sự kiện.");
    }
  };

  return (
    <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 sm:p-6 shadow-sm">
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
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
          />
          <input
            type="date"
            name="event_date"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-600 bg-white"
          />
        </div>

        {/* Thanh công cụ: Chuyển đổi tab Soạn thảo / Xem trước và Nút chèn ảnh */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white focus-within:border-amber-400 transition-colors">
          <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2 bg-stone-50/70 text-xs">
            {/* Tab chuyển đổi */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "edit"
                    ? "bg-white text-amber-700 shadow-xs border border-stone-200/80 font-bold"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <Edit3 className="size-3.5" /> Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "preview"
                    ? "bg-white text-amber-700 shadow-xs border border-stone-200/80 font-bold"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <Eye className="size-3.5" /> Xem trước
              </button>
            </div>

            {/* Nút bấm tải ảnh và trạng thái */}
            <div className="flex items-center gap-2">
              {uploadStatus && (
                <span className="text-amber-700 font-medium text-[11px] animate-pulse flex items-center gap-1">
                  {isUploading && <Loader2 className="size-3 animate-spin" />}
                  {uploadStatus}
                </span>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Chèn ảnh từ máy tính hoặc Paste ảnh (Ctrl + V)"
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-amber-700 font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <ImagePlus className="size-3.5 text-amber-600" />
                <span>Chèn ảnh</span>
              </button>
            </div>
          </div>

          {/* Vùng soạn thảo hoặc Xem trước */}
          {activeTab === "edit" ? (
            <textarea
              ref={textareaRef}
              name="content"
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              placeholder="Nội dung chi tiết... (Mẹo: Bạn có thể ấn Ctrl + V để dán trực tiếp ảnh chụp màn hình vào đây, hoặc kéo thả ảnh vào khung này)"
              className="w-full px-4 py-3 text-sm focus:outline-none resize-y min-h-[140px] text-stone-700"
            ></textarea>
          ) : (
            <div className="p-4 sm:p-5 min-h-[140px] bg-stone-50/30 overflow-y-auto max-h-[400px]">
              {content.trim() ? (
                <HistoryContentRenderer content={content} />
              ) : (
                <p className="text-stone-400 text-xs italic text-center py-6">
                  Chưa có nội dung xem trước. Hãy nhập nội dung bài viết và chèn ảnh ở tab Soạn thảo.
                </p>
              )}
            </div>
          )}

          {/* Hướng dẫn tiện ích */}
          <div className="px-3.5 py-2 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-500" />
              <span>Hỗ trợ dán ảnh (<strong>Ctrl + V</strong>) hoặc kéo thả. Ảnh được tự động nén trước khi tải lên.</span>
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <SubmitButton isUploading={isUploading} />
        </div>
      </form>
    </div>
  );
}

// Component Nút Xóa có Xác nhận
export function DeleteHistoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa mốc lịch sử này không? Hành động này không thể hoàn tác.")) {
      startTransition(async () => {
        try {
          await deleteHistoryEntry(id);
        } catch (error: unknown) {
          alert(error instanceof Error ? error.message : "Đã xảy ra lỗi khi xóa.");
        }
      });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      title="Xóa bài viết"
      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 className="size-4 animate-spin text-stone-400" /> : <Trash2 className="size-4" />}
    </button>
  );
}

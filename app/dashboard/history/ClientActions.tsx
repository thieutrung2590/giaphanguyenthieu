'use client';

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, CalendarPlus, ImagePlus, Eye, Edit3, Loader2, Sparkles, Pencil, X, Check } from "lucide-react";
import imageCompression from "browser-image-compression";
import { addHistoryEntry, updateHistoryEntry, deleteHistoryEntry, uploadHistoryImageAction } from "@/app/actions/historyActions";
import HistoryContentRenderer from "./HistoryContentRenderer";

// --- BỘ SOẠN THẢO DÙNG CHUNG CHO CẢ TẠO MỚI & SỬA BÀI VIẾT ---
interface HistoryEditorProps {
  content: string;
  onChange: (val: string) => void;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
  minRows?: number;
}

function HistoryEditor({ content, onChange, isUploading, setIsUploading, minRows = 6 }: HistoryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [uploadStatus, setUploadStatus] = useState("");

  const processAndUploadImage = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Vui lòng chọn một file hình ảnh hợp lệ.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Đang nén ảnh...");

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      setUploadStatus("Đang tải ảnh lên...");

      const formData = new FormData();
      formData.append("file", compressedFile, file.name || "pasted-image.jpg");

      const result = await uploadHistoryImageAction(formData);

      if (result.success && result.url) {
        const markdownImage = `\n![Hình ảnh](${result.url})\n`;
        const textarea = textareaRef.current;

        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentVal = textarea.value;
          const newVal = currentVal.substring(0, start) + markdownImage + currentVal.substring(end);

          onChange(newVal);

          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length);
          }, 50);
        } else {
          onChange(content + markdownImage);
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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processAndUploadImage(file);
        }
        break;
      }
    }
  };

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

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white focus-within:border-amber-400 transition-colors">
      <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2 bg-stone-50/70 text-xs">
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processAndUploadImage(f);
            }}
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

      {activeTab === "edit" ? (
        <textarea
          ref={textareaRef}
          name="content"
          required
          rows={minRows}
          value={content}
          onChange={(e) => onChange(e.target.value)}
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

      <div className="px-3.5 py-2 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3 text-amber-500" />
          <span>Hỗ trợ dán ảnh (<strong>Ctrl + V</strong>) hoặc kéo thả. Ảnh được tự động nén trước khi tải lên.</span>
        </span>
      </div>
    </div>
  );
}

// Nút submit có hiệu ứng Loading
function SubmitButton({ isUploading, label = "Đăng bài viết" }: { isUploading: boolean; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || isUploading}
      className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Đang lưu...
        </>
      ) : (
        label
      )}
    </button>
  );
}

// 1. Component Form Thêm mới
export function AddHistoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleAction = async (formData: FormData) => {
    try {
      formData.set("content", content);
      await addHistoryEntry(formData);
      formRef.current?.reset();
      setContent("");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Đã xảy ra lỗi khi thêm sự kiện.");
    }
  };

  return (
    <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 sm:p-6 shadow-sm mb-8">
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

        <HistoryEditor
          content={content}
          onChange={setContent}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          minRows={5}
        />

        <div className="flex justify-end pt-1">
          <SubmitButton isUploading={isUploading} label="Đăng bài viết" />
        </div>
      </form>
    </div>
  );
}

// 2. Component Modal Chỉnh sửa bài viết
interface EditHistoryModalProps {
  item: {
    id: string;
    title: string;
    content: string;
    event_date: string | null;
  };
  triggerClassName?: string;
  triggerLabel?: string;
}

export function EditHistoryModal({ item, triggerClassName, triggerLabel }: EditHistoryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [eventDate, setEventDate] = useState(item.event_date ? item.event_date.split('T')[0] : '');
  const [content, setContent] = useState(item.content);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTitle(item.title);
    setEventDate(item.event_date ? item.event_date.split('T')[0] : '');
    setContent(item.content);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isSaving) {
      setIsOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("Vui lòng nhập tiêu đề bài viết.");
    if (!content.trim()) return alert("Vui lòng nhập nội dung bài viết.");

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("event_date", eventDate.trim());
      formData.set("content", content.trim());

      await updateHistoryEntry(item.id, formData);
      setIsOpen(false);
    } catch (error) {
      console.error("Lỗi cập nhật bài viết:", error);
      alert(error instanceof Error ? error.message : "Đã xảy ra lỗi khi cập nhật bài viết.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Sửa bài viết"
        className={triggerClassName || "p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1.5"}
      >
        <Pencil className="size-4" />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-stone-100 max-h-[92vh] flex flex-col scale-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Edit3 className="size-5 text-amber-600" />
                Chỉnh sửa bài viết lịch sử
              </h3>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Tiêu đề bài viết *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tiêu đề bài viết..."
                    className="w-full px-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Ngày sự kiện</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nội dung chi tiết *</label>
                <HistoryEditor
                  content={content}
                  onChange={setContent}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  minRows={6}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// 3. Component Nút Xóa có Xác nhận
export function DeleteHistoryButton({ id, triggerClassName }: { id: string; triggerClassName?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      className={triggerClassName || "p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"}
    >
      {isPending ? <Loader2 className="size-4 animate-spin text-stone-400" /> : <Trash2 className="size-4" />}
    </button>
  );
}

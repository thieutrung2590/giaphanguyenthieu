"use client";

import { AnimatePresence, motion } from "framer-motion";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
  AlertCircle,
  Download,
  FileImage,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: "png" | "pdf_image" | "pdf_vector") => {
    try {
      setIsExporting(true);
      setShowMenu(false);
      setError(null);

      // Thêm delay nhỏ để UI đóng menu trước khi chụp
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById("export-container");
      if (!element) throw new Error("Không tìm thấy vùng dữ liệu để xuất.");

      if (format === "pdf_vector") {
        // Xuất PDF thông qua hộp thoại in
        const style = document.createElement("style");
        style.innerHTML = `
          @media print {
            body * { visibility: hidden !important; }
            #export-container, #export-container * { visibility: visible !important; }
            #export-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              margin: 0 !important;
              padding: 20px !important;
              transform: none !important;
              width: 100% !important;
              overflow: visible !important;
            }
            .css-tree { overflow: visible !important; }
            @page {
              size: landscape;
              margin: 0.5cm;
            }
          }
        `;
        document.head.appendChild(style);
        
        const cleanupPrint = () => {
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
          window.removeEventListener("afterprint", cleanupPrint);
          setIsExporting(false);
        };
        
        window.addEventListener("afterprint", cleanupPrint);
        window.print();
        
        return;
      }

      element.classList.add("exporting");

      // Đợi font load xong trước khi chụp để không bị lỗi chữ
      await document.fonts.ready;

      // Tăng pixelRatio lên 3 để đạt độ phân giải siêu cao (Gấp 3 lần màn hình thực tế)
      const exportOptions = {
        cacheBust: true,
        backgroundColor: "#f5f5f4",
        pixelRatio: 3, 
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: `${element.scrollWidth}px`,
          height: `${element.scrollHeight}px`,
        },
      };

      if (format === "png") {
        const url = await toPng(element, exportOptions);
        const a = document.createElement("a");
        a.href = url;
        a.download = `giapha-sodo-${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (format === "pdf_image") {
        const imgData = await toPng(element, exportOptions);

        const width = element.scrollWidth;
        const height = element.scrollHeight;

        // Giữ nguyên kích thước thực tế thay vì nhét vào A4 để chữ không bị nhỏ xíu khi cây quá to
        const pdf = new jsPDF({
          orientation: width > height ? "landscape" : "portrait",
          unit: "px",
          format: [width, height],
        });
        
        pdf.addImage(imgData, "PNG", 0, 0, width, height);
        pdf.save(`giapha-sodo-${new Date().toISOString().split("T")[0]}.pdf`);
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("Đã xảy ra lỗi khi xuất file. Vui lòng thử lại.");
      setTimeout(() => setError(null), 5000);
    } finally {
      if (format !== "pdf_vector") {
        const element = document.getElementById("export-container");
        if (element) {
          element.classList.remove("exporting");
        }
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="btn"
      >
        {isExporting ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <Download className="size-4 shrink-0" />
        )}
        <span className="tracking-wide min-w-max">
          {isExporting ? "Đang xuất..." : "Xuất file"}
        </span>
      </button>

      <AnimatePresence>
        {showMenu && !isExporting && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
          >
            <button
              onClick={() => handleExport("png")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors text-left"
            >
              <FileImage className="size-4 shrink-0" />
              Lưu Ảnh PNG (Siêu nét)
            </button>
            <button
              onClick={() => handleExport("pdf_image")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors text-left border-t border-stone-100"
            >
              <FileImage className="size-4 shrink-0" />
              Lưu PDF (Ảnh chất lượng cao)
            </button>
            <button
              onClick={() => handleExport("pdf_vector")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors text-left border-t border-stone-100"
            >
              <FileText className="size-4 shrink-0" />
              <div className="flex flex-col">
                 <span>Lưu PDF (Bản in)</span>
                 <span className="text-[10px] text-stone-400">Chọn &quot;Lưu thành PDF&quot; ở hộp thoại in</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full right-0 mt-2 w-64 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 flex flex-col gap-1"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-red-800 leading-snug">
                  {error}
                </span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { ArrowLeft, CalendarDays, CalendarSearch, Clock, Loader2, Sparkles, User, Users, Briefcase, Coins, Heart, Compass, Zap, Download, History, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMemo, useState, useEffect, ElementType, ReactNode } from "react";
import { generateLaSo } from "tuvi-neo";
import { getLuangiaiAI } from "./action";
import { 
  CHI, 
  getBanMenh, 
  getPalaceCan, 
  calculateDaiVan, 
  getElementColor, 
  formatStarStatus, 
  getFourPillars 
} from "./tuvi-helper";

// --- TYPES & INTERFACES ---
interface ThemeConfig {
  glow1: string; glow2: string; shadowBox: string;
  textTitle: string; textSubtitle: string;
  borderInput: string; iconBg: string; iconText: string;
  divide: string; selectText: string; checkboxRing: string;
  btnGradient: string; historyIcon: string; historyBtn: string;
  btnDownload: string; centerBoxBg: string; centerBoxBorder: string;
  aiIconBg: string; aiBorder: string; badgeActive: string;
  badgeInactive: string; loaderText: string; canChiBadge: string;
  hourAccent: string;
}

interface FormDataState {
  historyKey?: string; // Khóa duy nhất cho lịch sử
  name: string; day: string; month: string; year: string;
  calendar: string; isLeapMonth: boolean; hour: string;
  minute: string; gender: string; viewYear: string;
}

interface Star {
  Name: string; 
  NguHanh: string | number; 
  DacTinh?: string;
  Status?: string;
}

interface House {
  Name: string; 
  Than?: number; 
  Tuan?: number; 
  Triet?: number;
  ChinhTinh: Star[]; 
  Saotot: Star[]; 
  Saoxau: Star[];
  TrangSinh?: string;
  CanCung?: string;
  ChiCungName?: string;
  DaiVan?: number;
}

interface ChartInfo {
  Name: string; 
  Nam: string; 
  Thang: string; 
  Ngay: string;
  Gio: string; 
  BanMenh: string; 
  Cuc: string; 
  AmDuong: string;
  ThanCu?: string;
}

interface ChartData {
  info: ChartInfo;
  gridCung: (House | null)[];
}

interface Html2CanvasOptions {
  scale: number;
  backgroundColor: string;
  useCORS: boolean;
  logging: boolean;
}

type Html2CanvasFn = (element: HTMLElement, options: Html2CanvasOptions) => Promise<HTMLCanvasElement>;

interface CustomWindow extends Window {
  html2canvas?: Html2CanvasFn;
}

// --- KIỂU DỮ LIỆU ĐẦU VÀO VÀ ĐẦU RA CHO TUVI-NEO ---
interface TuViNeoBirth {
  isLunar: boolean;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLeapMonth: boolean;
}

interface TuViNeoInput {
  name: string;
  gender: 'male' | 'female';
  birth: TuViNeoBirth;
}

interface TuViNeoInfoOutput {
  Name?: string;
  nam?: string; Nam?: string; namCanChi?: string;
  thang?: string; Thang?: string; thangCanChi?: string;
  ngay?: string; Ngay?: string; ngayCanChi?: string;
  gio?: string; Gio?: string; gioCanChi?: string;
  cuc?: string; Cuc?: string;
  cucNH?: number; CucNH?: number;
  amDuong?: string; AmDuong?: string;
  nguHanh?: string; NguHanh?: string; ban_menh?: string; BanMenh?: string; menh?: string;
  chuMenh?: string; ChuMenh?: string;
  chuThan?: string; ChuThan?: string;
  thanCu?: string; ThanCu?: string;
  VTMenh?: number;
}

interface TuViNeoOutput {
  Info?: TuViNeoInfoOutput;
  info?: TuViNeoInfoOutput;
  Cac_cung: House[];
  rawLaso?: {
    dnan?: boolean;
    cuc?: number;
    menh?: number;
  };
}

// --- BỘ TỪ ĐIỂN CHỦ ĐỀ (THEMES) DỰA THEO NGŨ HÀNH BẢN MỆNH ---
const THEMES: Record<string, ThemeConfig> = {
  default: {
    glow1: "bg-fuchsia-200/40", glow2: "bg-purple-300/30", shadowBox: "shadow-purple-900/10",
    textTitle: "text-purple-950", textSubtitle: "text-purple-700/80",
    borderInput: "border-purple-100 focus-within:border-purple-400 focus-within:ring-purple-100",
    iconBg: "bg-purple-50", iconText: "text-purple-600",
    divide: "border-purple-100 sm:divide-purple-100", selectText: "text-purple-700",
    checkboxRing: "text-purple-600 focus:ring-purple-500",
    btnGradient: "from-purple-600 to-fuchsia-500",
    historyIcon: "text-purple-800", historyBtn: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700",
    btnDownload: "bg-purple-600 hover:bg-purple-700 text-white",
    centerBoxBg: "bg-purple-50 border-purple-100", centerBoxBorder: "border-purple-200/60",
    aiIconBg: "bg-fuchsia-100 text-fuchsia-600", aiBorder: "border-purple-100",
    badgeActive: "bg-purple-600 text-white shadow-md border-transparent",
    badgeInactive: "bg-white text-purple-700 border-purple-200 hover:bg-purple-50",
    loaderText: "text-fuchsia-600", canChiBadge: "text-fuchsia-700 border-fuchsia-200",
    hourAccent: "text-fuchsia-600"
  },
  kim: {
    glow1: "bg-slate-300/40", glow2: "bg-gray-300/30", shadowBox: "shadow-slate-900/10",
    textTitle: "text-slate-900", textSubtitle: "text-slate-600",
    borderInput: "border-slate-200 focus-within:border-slate-400 focus-within:ring-slate-200",
    iconBg: "bg-slate-100", iconText: "text-slate-600",
    divide: "border-slate-200 sm:divide-slate-200", selectText: "text-slate-700",
    checkboxRing: "text-slate-600 focus:ring-slate-500",
    btnGradient: "from-slate-600 to-gray-500",
    historyIcon: "text-slate-800", historyBtn: "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700",
    btnDownload: "bg-slate-600 hover:bg-slate-700 text-white",
    centerBoxBg: "bg-slate-50 border-slate-200", centerBoxBorder: "border-slate-300/60",
    aiIconBg: "bg-gray-100 text-gray-600", aiBorder: "border-slate-200",
    badgeActive: "bg-slate-600 text-white shadow-md border-transparent",
    badgeInactive: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
    loaderText: "text-gray-600", canChiBadge: "text-gray-700 border-gray-200",
    hourAccent: "text-gray-600"
  },
  moc: {
    glow1: "bg-emerald-200/40", glow2: "bg-green-300/30", shadowBox: "shadow-emerald-900/10",
    textTitle: "text-emerald-950", textSubtitle: "text-emerald-700/80",
    borderInput: "border-emerald-100 focus-within:border-emerald-400 focus-within:ring-emerald-100",
    iconBg: "bg-emerald-50", iconText: "text-emerald-600",
    divide: "border-emerald-100 sm:divide-emerald-100", selectText: "text-emerald-700",
    checkboxRing: "text-emerald-600 focus:ring-emerald-500",
    btnGradient: "from-emerald-600 to-green-500",
    historyIcon: "text-emerald-800", historyBtn: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700",
    btnDownload: "bg-emerald-600 hover:bg-emerald-700 text-white",
    centerBoxBg: "bg-emerald-50 border-emerald-100", centerBoxBorder: "border-emerald-200/60",
    aiIconBg: "bg-green-100 text-green-600", aiBorder: "border-emerald-100",
    badgeActive: "bg-emerald-600 text-white shadow-md border-transparent",
    badgeInactive: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    loaderText: "text-green-600", canChiBadge: "text-green-700 border-green-200",
    hourAccent: "text-green-600"
  },
  thuy: {
    glow1: "bg-blue-200/40", glow2: "bg-cyan-300/30", shadowBox: "shadow-blue-900/10",
    textTitle: "text-blue-950", textSubtitle: "text-blue-700/80",
    borderInput: "border-blue-100 focus-within:border-blue-400 focus-within:ring-blue-100",
    iconBg: "bg-blue-50", iconText: "text-blue-600",
    divide: "border-blue-100 sm:divide-blue-100", selectText: "text-blue-700",
    checkboxRing: "text-blue-600 focus:ring-blue-500",
    btnGradient: "from-blue-600 to-cyan-500",
    historyIcon: "text-blue-800", historyBtn: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700",
    btnDownload: "bg-blue-600 hover:bg-blue-700 text-white",
    centerBoxBg: "bg-blue-50 border-blue-100", centerBoxBorder: "border-blue-200/60",
    aiIconBg: "bg-cyan-100 text-cyan-600", aiBorder: "border-blue-100",
    badgeActive: "bg-blue-600 text-white shadow-md border-transparent",
    badgeInactive: "bg-white text-blue-700 border-blue-200 hover:bg-blue-50",
    loaderText: "text-cyan-600", canChiBadge: "text-cyan-700 border-cyan-200",
    hourAccent: "text-cyan-600"
  },
  hoa: {
    glow1: "bg-red-200/40", glow2: "bg-orange-300/30", shadowBox: "shadow-red-900/10",
    textTitle: "text-red-950", textSubtitle: "text-red-700/80",
    borderInput: "border-red-100 focus-within:border-red-400 focus-within:ring-red-100",
    iconBg: "bg-red-50", iconText: "text-red-600",
    divide: "border-red-100 sm:divide-red-100", selectText: "text-red-700",
    checkboxRing: "text-red-600 focus:ring-red-500",
    btnGradient: "from-red-600 to-orange-500",
    historyIcon: "text-red-800", historyBtn: "bg-red-50 hover:bg-red-100 border-red-200 text-red-700",
    btnDownload: "bg-red-600 hover:bg-red-700 text-white",
    centerBoxBg: "bg-red-50 border-red-100", centerBoxBorder: "border-red-200/60",
    aiIconBg: "bg-orange-100 text-orange-600", aiBorder: "border-red-100",
    badgeActive: "bg-red-600 text-white shadow-md border-transparent",
    badgeInactive: "bg-white text-red-700 border-red-200 hover:bg-red-50",
    loaderText: "text-orange-600", canChiBadge: "text-orange-700 border-orange-200",
    hourAccent: "text-orange-600"
  },
  tho: {
    glow1: "bg-amber-200/40", glow2: "bg-yellow-300/30", shadowBox: "shadow-amber-900/10",
    textTitle: "text-amber-950", textSubtitle: "text-amber-700/80",
    borderInput: "border-amber-100 focus-within:border-amber-400 focus-within:ring-amber-100",
    iconBg: "bg-amber-50", iconText: "text-amber-600",
    divide: "border-amber-100 sm:divide-amber-100", selectText: "text-amber-700",
    checkboxRing: "text-amber-600 focus:ring-amber-500",
    btnGradient: "from-amber-600 to-yellow-500",
    historyIcon: "text-amber-800", historyBtn: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700",
    btnDownload: "bg-amber-600 hover:bg-amber-700 text-white",
    centerBoxBg: "bg-amber-50 border-amber-100", centerBoxBorder: "border-amber-200/60",
    aiIconBg: "bg-yellow-100 text-yellow-600", aiBorder: "border-amber-100",
    badgeActive: "bg-amber-600 text-white shadow-md border-transparent",
    badgeInactive: "bg-white text-amber-700 border-amber-200 hover:bg-amber-50",
    loaderText: "text-yellow-600", canChiBadge: "text-yellow-700 border-yellow-200",
    hourAccent: "text-yellow-600"
  }
};

function getHourCanChiName(hourStr: string): string {
  if (!hourStr) return "Giờ";
  const h = parseInt(hourStr);
  if (isNaN(h)) return "Giờ";
  const index = Math.floor((h + 1) / 2) % 12;
  return `Giờ ${CHI[index] || ""}`;
}

function getYearCanChi(yearStr: string): string {
  if (!yearStr) return "";
  const y = parseInt(yearStr);
  if (isNaN(y)) return "";
  const CAN = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
  const CHI_ARR = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];
  return `Năm ${CAN[y % 10] || ""} ${CHI_ARR[y % 12] || ""}`;
}

function isValidDate(day: number, month: number, year: number, isLunar: boolean): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (!isLunar) {
    const testDate = new Date(year, month - 1, day);
    return (
      testDate.getFullYear() === year &&
      testDate.getMonth() === month - 1 &&
      testDate.getDate() === day
    );
  } else {
    if (day > 30) return false;
    return true;
  }
}

function generateHistoryKey(data: FormDataState): string {
  return `${data.name.trim().toLowerCase()}-${data.day}-${data.month}-${data.year}-${data.hour}-${data.minute}-${data.calendar}`;
}

const InputWrapper = ({ icon: Icon, children, themeObj }: { icon: ElementType; children: ReactNode, themeObj: ThemeConfig }) => (
  <div className={`flex items-start sm:items-center bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border ${themeObj.borderInput} transition-all duration-300`}>
    <div className={`w-11 h-11 ${themeObj.iconBg} rounded-xl flex items-center justify-center ${themeObj.iconText} shrink-0 ml-0.5 mt-1 sm:mt-0`}><Icon className="w-5 h-5" /></div>
    <div className="flex-1 px-2 sm:px-3 w-full overflow-hidden">{children}</div>
  </div>
);

const CHI_OF_GRID: Record<number, string> = { 
  0: "Tỵ", 1: "Ngọ", 2: "Mùi", 3: "Thân", 
  4: "Thìn", 7: "Dậu", 
  8: "Mão", 11: "Tuất", 
  12: "Dần", 13: "Sửu", 14: "Tý", 15: "Hợi" 
};

function renderAIReadingContent(content: string) {
  if (!content) return null;

  const isError = content.startsWith("Lỗi:") || content.startsWith("LỖI");
  if (isError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
        {content}
      </div>
    );
  }

  // Chia nhỏ theo các đoạn văn
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-4">
      {blocks.map((block, bIdx) => {
        const lines = block.split("\n");
        return (
          <div key={bIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              // Kiểm tra dòng tiêu đề: ### ..., **1. ...**, 1. ... **
              const isHeading = /^(\#{1,4}\s+|\*\*\d+[\.\)]|\d+[\.\)]\s+\*\*)/.test(trimmed);
              const isBullet = /^[•\-\*]\s+/.test(trimmed);

              const renderWithBold = (str: string) => {
                const parts = str.split(/(\*\*[^*]+\*\*)/g);
                return parts.map((part, idx) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={idx} className="font-bold text-stone-900">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return part;
                });
              };

              if (isHeading) {
                const cleanHeading = trimmed.replace(/^#+\s*/, "");
                return (
                  <div
                    key={lIdx}
                    className="text-base sm:text-lg font-bold text-amber-900 tracking-wide mt-3 pt-2 border-b border-amber-200/50 pb-1"
                  >
                    {renderWithBold(cleanHeading)}
                  </div>
                );
              }

              if (isBullet) {
                const bulletContent = trimmed.replace(/^[•\-\*]\s+/, "");
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-2 sm:pl-3 text-sm sm:text-base leading-relaxed text-stone-700">
                    <span className="text-amber-600 mt-1 shrink-0 text-xs">◆</span>
                    <span className="flex-1">{renderWithBold(bulletContent)}</span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="text-sm sm:text-base leading-relaxed text-stone-700 text-justify">
                  {renderWithBold(trimmed)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function TuViPage() {
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState<FormDataState>({
    name: "Nguyễn Thiệu", day: "25", month: "5", year: "1990", calendar: "Âm lịch", 
    isLeapMonth: false,
    hour: "10", minute: "0", 
    gender: "Nam giới", viewYear: String(currentYear)
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  
  const [appTheme, setAppTheme] = useState<string>("default"); 

  const [aiReading, setAiReading] = useState<string>("");
  const [isReading, setIsReading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("tong_quan"); 
  const [aiCache, setAiCache] = useState<Record<string, string>>({});
  
  const [history, setHistory] = useState<FormDataState[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }>({ 
    isOpen: false, title: "", message: "", onConfirm: () => {}, onCancel: () => {} 
  });

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('tuvi_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as FormDataState[];
        if (Array.isArray(parsed)) queueMicrotask(() => setHistory(parsed));
      } catch (error) {
        console.error("Lỗi parse history:", error);
        localStorage.removeItem('tuvi_history');
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
  };

  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const executeCapture = async () => {
      try {
        const el = document.getElementById("laso-chart");
        if (!el) throw new Error("Không tìm thấy lá số");
        
        await new Promise(resolve => setTimeout(resolve, 500));

        const win = window as unknown as CustomWindow;
        if (!win.html2canvas) throw new Error("Thư viện html2canvas chưa được tải");

        const canvas = await win.html2canvas(el, { 
          scale: 2, 
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false
        });

        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `La-So-${formData.name.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsDownloading(false);
      } catch (err) {
        console.error("Lỗi html2canvas:", err);
        setIsDownloading(false);
        setConfirmDialog({
          isOpen: true,
          title: "Trình duyệt chặn tạo ảnh",
          message: "Tính năng tự động tải ảnh đang bị trình duyệt chặn. Bạn có muốn dùng tính năng In (Lưu thành PDF chất lượng cao) để thay thế không?",
          onConfirm: () => {
            window.print();
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          }
        });
      }
    };

    const win = window as unknown as CustomWindow;
    if (win.html2canvas) {
      executeCapture();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.onload = executeCapture;
      script.onerror = () => {
        setIsDownloading(false);
        showToast("Lỗi mạng: Không thể tải thư viện hỗ trợ chụp ảnh.", "error");
      };
      document.body.appendChild(script);
    }
  };

  const fetchAIReading = async (cat: string, currentChartData: ChartData) => {
    setActiveCategory(cat);
    if (aiCache[cat]) {
      setAiReading(aiCache[cat]);
      return;
    }

    setIsReading(true);
    setAiReading("");

    const menhCung = currentChartData.gridCung.find((c): c is House => c !== null && c.Name === "Mệnh");
    const quanLocCung = currentChartData.gridCung.find((c): c is House => c !== null && c.Name === "Quan lộc");
    const taiBachCung = currentChartData.gridCung.find((c): c is House => c !== null && c.Name === "Tài bạch");
    const phuTheCung = currentChartData.gridCung.find((c): c is House => c !== null && c.Name === "Phu thê");
    const phucDucCung = currentChartData.gridCung.find((c): c is House => c !== null && c.Name === "Phúc đức");
    const thienDiCung = currentChartData.gridCung.find((c): c is House => c !== null && c.Name === "Di");

    const formatCungStars = (cung?: House) => {
      if (!cung) return "Không rõ";
      const ct = (cung.ChinhTinh || []).map(s => `${s.Name} ${s.Status ? `(${s.Status})` : ""}`).join(", ") || "Vô chính diệu";
      const st = (cung.Saotot || []).map(s => s.Name).slice(0, 6).join(", ");
      const sx = (cung.Saoxau || []).map(s => s.Name).slice(0, 5).join(", ");
      let res = `Chính tinh: ${ct}`;
      if (st) res += `; Cát tinh: ${st}`;
      if (sx) res += `; Hung tinh: ${sx}`;
      if (cung.Tuan) res += " [Có Tuần Không]";
      if (cung.Triet) res += " [Có Triệt Lộ]";
      return res;
    };

    const chinhTinhMenh = (menhCung?.ChinhTinh || []).map(s => `${s.Name} ${s.Status ? `(${s.Status})` : ""}`).join(", ") || "Không có chính tinh (Vô Chính Diệu)";
    
    const tuanTrietArr: string[] = [];
    if (menhCung?.Tuan === 1) tuanTrietArr.push("Tuần Không");
    if (menhCung?.Triet === 1) tuanTrietArr.push("Triệt Lộ");
    const tuanTrietStr = tuanTrietArr.length > 0 ? tuanTrietArr.join(" và ") : "Cung Mệnh sáng sủa, không bị Tuần Không hay Triệt Lộ án ngữ.";

    const aiPromptData = {
      name: currentChartData.info.Name,
      gender: formData.gender,
      amDuong: currentChartData.info.AmDuong,
      banMenh: currentChartData.info.BanMenh,
      cuc: currentChartData.info.Cuc,
      chinhTinh: chinhTinhMenh,
      thanCu: currentChartData.info.ThanCu,
      tuanTriet: tuanTrietStr,
      category: cat,
      viewYear: formData.viewYear,
      quanLocInfo: formatCungStars(quanLocCung),
      taiBachInfo: formatCungStars(taiBachCung),
      phuTheInfo: formatCungStars(phuTheCung),
      phucDucInfo: formatCungStars(phucDucCung),
      thienDiInfo: formatCungStars(thienDiCung)
    };

    try {
      const readingResult = await getLuangiaiAI(aiPromptData);
      if (typeof readingResult !== "string") throw new Error("Định dạng dữ liệu không hợp lệ");
      setAiReading(readingResult);
      setAiCache(prev => ({ ...prev, [cat]: readingResult }));
    } catch (error) {
      console.error("Lỗi AI:", error);
      setAiReading("Đã xảy ra lỗi khi phân tích. Vui lòng thử lại sau.");
      showToast("Lỗi kết nối phân tích AI", "error");
    } finally {
      setIsReading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return showToast("Vui lòng nhập họ và tên!");
    if (!formData.year) return showToast("Vui lòng chọn năm sinh!");
    if (formData.hour === "") return showToast("Vui lòng chọn giờ sinh!");
    if (formData.minute === "") return showToast("Vui lòng chọn phút sinh!");
    
    const y = parseInt(formData.year) || 1990;
    const m = parseInt(formData.month) || 1;
    const d = parseInt(formData.day) || 1;
    const h = parseInt(formData.hour) || 0;
    const min = parseInt(formData.minute) || 0;
    const isLunar = formData.calendar === "Âm lịch";

    if (!isValidDate(d, m, y, isLunar)) {
      return showToast(`Ngày ${d}/${m}/${y} không hợp lệ theo ${formData.calendar}!`);
    }
    
    setIsLoading(true);
    setAiReading("");
    setAiCache({}); 

    const curHistoryKey = generateHistoryKey(formData);
    const dataToSave = { ...formData, historyKey: curHistoryKey };
    const newHistory = [
      dataToSave, 
      ...history.filter(h => h.historyKey !== curHistoryKey)
    ].slice(0, 5);

    setHistory(newHistory);
    localStorage.setItem('tuvi_history', JSON.stringify(newHistory));

    setTimeout(() => {
      try {
        // Tính toán Can Chi Tứ Trụ chuẩn xác (Năm, Tháng, Ngày, Giờ)
        const fourPillars = getFourPillars({
          isLunar,
          day: d,
          month: m,
          year: y,
          hour: h,
          minute: min,
        });

        // Xử lý tháng nhuận theo chuẩn Tử Vi: từ ngày 16 trở đi tính sang tháng tiếp theo
        let calcMonth = m;
        if (isLunar && formData.isLeapMonth && d >= 16) {
          calcMonth = m + 1;
        }

        const inputArgs: TuViNeoInput = {
          name: formData.name,
          gender: formData.gender === "Nam giới" ? 'male' : 'female',
          birth: { 
            isLunar: isLunar, 
            year: y, 
            month: calcMonth, 
            day: d, 
            hour: h, 
            minute: min, 
            isLeapMonth: formData.isLeapMonth 
          },
        };

        const laso = generateLaSo(inputArgs as never) as unknown as TuViNeoOutput;
        if (!laso || !laso.Cac_cung) throw new Error("Thư viện trả về dữ liệu rỗng");

        const rawInfo = laso.Info || laso.info || {};
        
        // Bản Mệnh nạp âm chuẩn hóa 60 Hoa Giáp
        const computedBanMenh = getBanMenh(fourPillars.nam);
        const finalBanMenh = computedBanMenh !== "Chưa xác định" ? computedBanMenh : "Chưa xác định";

        // Xác định số Cục (2, 3, 4, 5, 6)
        let cucNum = 2;
        const cucText = (rawInfo.Cuc || rawInfo.cuc || "").toLowerCase();
        if (cucText.includes("thủy") || cucText.includes("nhị")) cucNum = 2;
        else if (cucText.includes("mộc") || cucText.includes("tam")) cucNum = 3;
        else if (cucText.includes("kim") || cucText.includes("tứ")) cucNum = 4;
        else if (cucText.includes("thổ") || cucText.includes("ngũ")) cucNum = 5;
        else if (cucText.includes("hỏa") || cucText.includes("lục")) cucNum = 6;
        else if (rawInfo.CucNH) cucNum = rawInfo.CucNH;

        // Xác định chiều Đại Vận (Dương Nam / Âm Nữ đi thuận; Âm Nam / Dương Nữ đi nghịch)
        const isThuan = laso.rawLaso?.dnan ?? (
          (formData.gender === "Nam giới" && (fourPillars.yearCanIndex % 2 === 0)) ||
          (formData.gender === "Nữ giới" && (fourPillars.yearCanIndex % 2 === 1))
        );

        // Vị trí cung Mệnh (0..11)
        const menhChiIdx = rawInfo.VTMenh !== undefined ? (rawInfo.VTMenh - 1 + 12) % 12 : 0;
        const daiVanMap = calculateDaiVan(cucNum, menhChiIdx, isThuan);

        // Ánh xạ 12 cung lên lưới bàn cờ 4x4 (16 ô)
        const GRID_TO_CUNG: Record<number, number> = { 
          0: 5, 1: 6, 2: 7, 3: 8, 4: 4, 7: 9, 8: 3, 11: 10, 12: 2, 13: 1, 14: 0, 15: 11 
        };
        
        const gridCacCung: (House | null)[] = Array(16).fill(null);
        Object.keys(GRID_TO_CUNG).forEach((str) => {
          const gridIdx = parseInt(str);
          const chiIdx = GRID_TO_CUNG[gridIdx]; // 0: Tý .. 11: Hợi
          const rawHouse = laso.Cac_cung[chiIdx];

          if (rawHouse) {
            // Gán thêm Can Cung (theo Ngũ Hổ Độn) và số tuổi Đại Vận
            const palaceCan = getPalaceCan(fourPillars.yearCanIndex, chiIdx);
            const palaceChi = CHI[chiIdx];
            const enrichedHouse: House = {
              ...rawHouse,
              CanCung: `${palaceCan} ${palaceChi}`,
              ChiCungName: palaceChi,
              DaiVan: daiVanMap[chiIdx]
            };
            gridCacCung[gridIdx] = enrichedHouse;
          }
        });

        // Đổi màu chủ đề theo Bản Mệnh ngũ hành
        let newTheme = "default";
        const bmLower = finalBanMenh.toLowerCase();
        if (bmLower.includes("kim")) newTheme = "kim";
        else if (bmLower.includes("mộc") || bmLower.includes("moc")) newTheme = "moc";
        else if (bmLower.includes("thủy") || bmLower.includes("thuy")) newTheme = "thuy";
        else if (bmLower.includes("hỏa") || bmLower.includes("hoa")) newTheme = "hoa";
        else if (bmLower.includes("thổ") || bmLower.includes("tho")) newTheme = "tho";
        setAppTheme(newTheme);

        const safeInfo: ChartInfo = {
          Name: formData.name,
          Nam: fourPillars.nam,
          Thang: fourPillars.thang,
          Ngay: fourPillars.ngay,
          Gio: fourPillars.gio,
          BanMenh: finalBanMenh,
          Cuc: rawInfo.Cuc || rawInfo.cuc || "Chưa xác định",
          AmDuong: rawInfo.AmDuong || rawInfo.amDuong || (formData.gender === "Nam giới" ? "Dương Nam" : "Âm Nữ"),
          ThanCu: rawInfo.ThanCu || rawInfo.thanCu || ""
        };

        const newChartData: ChartData = { info: safeInfo, gridCung: gridCacCung };
        setChartData(newChartData);
        setShowResult(true);
        setIsLoading(false);

        fetchAIReading("tong_quan", newChartData);

      } catch (error) {
        console.error("Lỗi lập lá số:", error);
        showToast("Lỗi lập lá số, vui lòng kiểm tra lại thông tin cung cấp!", "error");
        setIsLoading(false);
      }
    }, 20); 
  };

  const canChiText = useMemo(() => getYearCanChi(formData.year), [formData.year]);
  const theme = THEMES[appTheme];

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium animate-in slide-in-from-top-2 duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition-opacity"><X className="w-4 h-4" /></button>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={confirmDialog.onCancel} className="px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors">Hủy</button>
              <button onClick={confirmDialog.onConfirm} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-sm">Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ${theme.glow1} rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 print:hidden`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] ${theme.glow2} rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 print:hidden`}></div>

        <div className={`relative w-full max-w-5xl bg-white/80 backdrop-blur-xl border border-white/60 p-5 sm:p-8 rounded-[2.5rem] shadow-2xl ${theme.shadowBox} transition-colors duration-1000 print:border-none print:shadow-none print:bg-white print:p-0`}>
          {!showResult ? (
            <div className="max-w-2xl mx-auto print:hidden">
              <div className="text-center mb-8">
                <h1 className={`text-3xl sm:text-4xl font-bold ${theme.textTitle} mb-3 tracking-tight`}>Lập lá số Tử Vi</h1>
                <p className={`${theme.textSubtitle} text-sm sm:text-base font-medium`}>Khám phá vận mệnh - Định hướng tương lai</p>
              </div>
              
              <div className="space-y-4">
                <InputWrapper icon={User} themeObj={theme}>
                  <div className="h-10 sm:h-11 flex items-center">
                     <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và tên" className="w-full bg-transparent outline-none text-stone-700 font-semibold" />
                  </div>
                </InputWrapper>
                
                <div className="relative">
                  <InputWrapper icon={CalendarDays} themeObj={theme}>
                    <div className={`grid grid-cols-6 sm:flex sm:items-center w-full text-stone-700 text-[13.5px] sm:text-sm font-medium py-2 sm:py-0 gap-y-2.5 sm:gap-y-0 sm:divide-x ${theme.divide}`}>
                      <select name="day" value={formData.day} onChange={handleChange} className="col-span-2 bg-transparent outline-none w-full pr-1">
                        <option value="">Ngày</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <option key={d} value={d}>Ngày {d}</option>)}
                      </select>
                      
                      <select name="month" value={formData.month} onChange={handleChange} className={`col-span-2 bg-transparent outline-none w-full px-1 border-l sm:border-l-0 ${theme.divide}`}>
                        <option value="">Tháng</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                      </select>
                      
                      <select name="year" value={formData.year} onChange={handleChange} className={`col-span-2 bg-transparent outline-none w-full pl-1 sm:px-2 border-l sm:border-l-0 ${theme.divide}`}>
                        <option value="">Năm</option>
                        {Array.from({ length: 100 }, (_, i) => String(currentYear - i)).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      
                      <select name="calendar" value={formData.calendar} onChange={handleChange} className={`col-span-4 bg-transparent outline-none w-full pr-1 sm:px-2 pt-2 sm:pt-0 border-t sm:border-t-0 font-bold ${theme.selectText} ${theme.divide}`}>
                        <option value="Dương lịch">Dương lịch</option>
                        <option value="Âm lịch">Âm lịch</option>
                      </select>
                      
                      <div className={`col-span-2 flex items-center justify-center sm:justify-start gap-1.5 pl-1 sm:pl-3 border-t sm:border-t-0 border-l sm:border-l-0 pt-2 sm:pt-0 ${theme.divide}`}>
                        <input type="checkbox" name="isLeapMonth" id="leapMonth" checked={formData.isLeapMonth} onChange={handleChange} disabled={formData.calendar !== "Âm lịch"} className={`w-4 h-4 border-gray-300 rounded cursor-pointer disabled:opacity-50 ${theme.checkboxRing}`} />
                        <label htmlFor="leapMonth" className={`text-xs font-bold whitespace-nowrap ${formData.calendar === "Âm lịch" ? "cursor-pointer " + theme.selectText : "text-gray-400"}`}>Nhuận</label>
                      </div>
                    </div>
                  </InputWrapper>
                  {canChiText && <div className="absolute -bottom-2 right-4 translate-y-full flex items-center z-10"><span className={`text-xs font-bold bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border ${theme.canChiBadge}`}>{canChiText}</span></div>}
                </div>
                <div className="h-4"></div>
                
                <InputWrapper icon={Clock} themeObj={theme}>
                  <div className={`grid grid-cols-2 sm:flex sm:items-center w-full text-stone-700 text-sm font-medium py-2 sm:py-0 gap-y-2.5 sm:gap-y-0 sm:divide-x ${theme.divide}`}>
                    <select name="hour" value={formData.hour} onChange={handleChange} className="bg-transparent outline-none w-full pr-1 sm:pr-2 cursor-pointer">
                      <option value="">Giờ sinh</option>
                      {Array.from({ length: 24 }, (_, i) => String(i)).map(h => (
                        <option key={h} value={h}>{h.padStart(2, '0')} giờ</option>
                      ))}
                    </select>
                    
                    <select name="minute" value={formData.minute} onChange={handleChange} className={`bg-transparent outline-none w-full px-1 sm:px-2 border-l sm:border-l-0 ${theme.divide} cursor-pointer`}>
                      <option value="">Phút sinh</option>
                      {Array.from({ length: 60 }, (_, i) => String(i)).map(m => (
                        <option key={m} value={m}>{m.padStart(2, '0')} phút</option>
                      ))}
                    </select>
                    
                    <div className={`col-span-2 w-full pt-2 sm:pt-0 sm:pl-2 font-bold text-center sm:text-left border-t sm:border-t-0 pointer-events-none ${theme.hourAccent} ${theme.divide}`}>
                      {getHourCanChiName(formData.hour)}
                    </div>
                  </div>
                </InputWrapper>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputWrapper icon={Users} themeObj={theme}>
                    <div className="h-10 sm:h-11 flex items-center">
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold"><option value="Nam giới">Nam giới</option><option value="Nữ giới">Nữ giới</option></select>
                    </div>
                  </InputWrapper>
                  <InputWrapper icon={CalendarSearch} themeObj={theme}>
                    <div className="h-10 sm:h-11 flex items-center">
                      <select name="viewYear" value={formData.viewYear} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer">
                        {Array.from({ length: 11 }, (_, i) => String(currentYear + i)).map(y => (
                          <option key={y} value={y}>Năm xem {y}</option>
                        ))}
                      </select>
                    </div>
                  </InputWrapper>
                </div>

                <button onClick={handleSubmit} disabled={isLoading} className={`w-full mt-6 bg-gradient-to-r text-white font-bold text-lg py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 ${theme.btnGradient}`}>
                  {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" />Đang lập lá số...</> : "Xem luận giải"}
                </button>
              </div>

              {history.length > 0 && (
                <div className={`mt-8 pt-6 border-t sm:border-t-0 sm:pt-0 ${theme.divide}`}>
                  <div className={`flex items-center gap-2 mb-3 font-bold text-sm ${theme.historyIcon}`}>
                    <History className="w-4 h-4" /> Đã tra cứu gần đây:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((h, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setFormData(h)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors border ${theme.historyBtn}`}
                      >
                        {h.name} ({h.year})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4 sm:mb-6 print:hidden">
                <button onClick={() => setShowResult(false)} className={`flex items-center gap-2 text-stone-500 font-medium bg-white px-4 py-2 rounded-xl border border-stone-200 hover:${theme.selectText}`}>
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
                <h2 className={`text-2xl font-bold hidden sm:block ${theme.textTitle}`}>Lá số Tử vi</h2>
                
                <button 
                  onClick={handleDownload} 
                  disabled={isDownloading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-colors disabled:opacity-50 font-medium ${theme.btnDownload}`}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isDownloading ? "Đang tải..." : "Tải ảnh (hoặc PDF)"}</span>
                </button>
              </div>

              <div id="laso-chart" className="grid grid-cols-4 grid-rows-4 gap-1 sm:gap-2 max-w-5xl mx-auto h-[620px] sm:h-[780px] bg-stone-200/50 p-1.5 sm:p-2 rounded-xl border border-stone-300">
                {Array.from({ length: 16 }).map((_, i) => {
                  const isCenter = [5, 6, 9, 10].includes(i);
                  if (isCenter) {
                    if (i === 5) return (
                      <div key={i} className="col-span-2 row-span-2 bg-[#fffcfa] rounded-lg flex flex-col items-center justify-center border-2 border-stone-200 p-2 sm:p-4 text-center">
                        <h3 className="text-xl sm:text-2xl font-bold text-red-700 uppercase mb-1">{chartData?.info?.Name || "Không rõ"}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-stone-600 mb-1">
                          Sinh: <span className={theme.selectText}>{String(formData.hour).padStart(2, '0')}:{String(formData.minute).padStart(2, '0')} ngày {formData.day}/{formData.month}/{formData.year} ({formData.calendar}{formData.calendar === "Âm lịch" && formData.isLeapMonth ? " - Nhuận" : ""})</span>
                        </p>
                        
                        <div className={`w-full max-w-[360px] p-2 sm:p-3 rounded-lg border mt-2 sm:mt-3 ${theme.centerBoxBg}`}>
                          <div className={`grid grid-cols-4 gap-1 text-[10px] sm:text-xs text-center border-b pb-2 mb-2 ${theme.centerBoxBorder}`}>
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 mb-0.5 font-medium">Năm</span>
                              <strong className="text-stone-800 capitalize leading-tight font-bold">{chartData?.info?.Nam || "-"}</strong>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 mb-0.5 font-medium">Tháng</span>
                              <strong className="text-stone-800 capitalize leading-tight font-bold">{chartData?.info?.Thang || "-"}</strong>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 mb-0.5 font-medium">Ngày</span>
                              <strong className="text-stone-800 capitalize leading-tight font-bold">{chartData?.info?.Ngay || "-"}</strong>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-stone-500 mb-0.5 font-medium">Giờ</span>
                              <strong className="text-stone-800 capitalize leading-tight font-bold">{chartData?.info?.Gio || "-"}</strong>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] sm:text-xs text-left px-1">
                            <p><span className="text-stone-500">Bản Mệnh:</span> <strong className="text-stone-800">{chartData?.info?.BanMenh || "-"}</strong></p>
                            <p><span className="text-stone-500">Cục:</span> <strong className="text-stone-800">{chartData?.info?.Cuc || "-"}</strong></p>
                            <p><span className="text-stone-500">Âm Dương:</span> <strong className="text-stone-800">{chartData?.info?.AmDuong || "-"}</strong></p>
                            <p><span className="text-stone-500">Cung Thân:</span> <strong className="text-stone-800">{chartData?.info?.ThanCu || "-"}</strong></p>
                          </div>
                        </div>
                      </div>
                    );
                    return null;
                  }

                  const house = chartData?.gridCung?.[i];
                  if (!house) return <div key={i} className="bg-transparent" />;
                  const isMenh = house.Name === "Mệnh";
                  const isThan = house.Than === 1;

                  let highlightClass = "border border-stone-200 bg-white";
                  if (isMenh) highlightClass = "border-[2px] border-red-400 bg-red-50/50 shadow-sm";
                  else if (isThan) highlightClass = "border-[2px] border-fuchsia-400 bg-fuchsia-50/50 shadow-sm";

                  return (
                    <div key={i} className={`relative rounded-lg p-1.5 flex flex-col justify-between overflow-hidden ${highlightClass}`}>
                      {/* Tiêu đề Cung: Tên cung, Thân, Can Cung, Tuổi Đại Vận */}
                      <div className="flex justify-between items-center border-b border-stone-100 pb-1 mb-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-[12px] sm:text-[13px] font-bold ${isMenh ? 'text-red-600' : isThan ? 'text-fuchsia-700' : 'text-stone-700'}`}>
                            {house.Name}
                          </span>
                          {isThan && !isMenh && <span className="text-[9px] font-bold text-fuchsia-600 bg-fuchsia-100 px-1 rounded">(Thân)</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {house.DaiVan !== undefined && (
                            <span className="text-[9px] font-bold text-stone-600 bg-stone-100 px-1 py-0.5 rounded border border-stone-200/50" title="Tuổi bắt đầu Đại Vận">
                              {house.DaiVan}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-500 font-semibold bg-stone-50 px-1 rounded border border-stone-200/60">
                            {house.CanCung || CHI_OF_GRID[i]}
                          </span>
                        </div>
                      </div>
                      
                      {/* Danh sách sao: Chính tinh & Phụ tinh */}
                      <div className="flex-1 overflow-y-auto space-y-0.5 flex flex-col items-center scrollbar-hide">
                        <div className="flex flex-col items-center mb-1 w-full gap-0.5">
                          {(house.ChinhTinh || []).map((star: Star, idx: number) => {
                            const statusInfo = formatStarStatus(star.Status || star.DacTinh);
                            return (
                              <div key={`ct-${idx}`} className={`text-[11px] sm:text-[12px] font-bold uppercase ${getElementColor(star.NguHanh, true)} flex items-center gap-1`}>
                                <span>{star.Name}</span>
                                {statusInfo && <span className={`text-[9px] ${statusInfo.className}`}>{statusInfo.label}</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-2 w-full gap-1 mt-1 border-t border-stone-100 pt-1">
                          <div className="flex flex-col items-start space-y-0.5">
                            {(house.Saotot || []).map((star: Star, idx: number) => (
                              <div key={`st-${idx}`} className={`text-[10px] font-medium leading-tight ${getElementColor(star.NguHanh)}`}>
                                {star.Name}
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col items-end space-y-0.5">
                            {(house.Saoxau || []).map((star: Star, idx: number) => (
                              <div key={`sx-${idx}`} className={`text-[10px] font-medium text-right leading-tight ${getElementColor(star.NguHanh)}`}>
                                {star.Name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Chân cung: Sao Vòng Tràng Sinh & Tuần / Triệt */}
                      <div className="flex justify-between items-end pt-1 border-t border-stone-50 text-[9px] mt-0.5">
                        <span className="text-stone-400 font-medium italic">
                          {house.TrangSinh || ""}
                        </span>
                        <div className="flex gap-0.5">
                          {house.Tuan === 1 && <span className="text-[9px] font-bold text-white bg-slate-700 px-1 py-[0.5px] rounded-sm shadow-xs">Tuần</span>}
                          {house.Triet === 1 && <span className="text-[9px] font-bold text-white bg-slate-900 px-1 py-[0.5px] rounded-sm shadow-xs">Triệt</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`mt-8 max-w-5xl mx-auto bg-white p-5 sm:p-8 rounded-2xl border shadow-sm ${theme.aiBorder}`}>
                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b pb-4 print:hidden ${theme.centerBoxBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme.aiIconBg}`}><Sparkles className="w-6 h-6" /></div>
                    <h3 className={`text-xl font-bold ${theme.textTitle}`}>AI Luận Giải Lá Số</h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => chartData && fetchAIReading("tong_quan", chartData)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "tong_quan" ? theme.badgeActive : theme.badgeInactive}`}
                    >
                      <Compass className="w-3.5 h-3.5" /> Tổng quan
                    </button>
                    <button 
                      onClick={() => chartData && fetchAIReading("cong_danh", chartData)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "cong_danh" ? theme.badgeActive : theme.badgeInactive}`}
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Công danh
                    </button>
                    <button 
                      onClick={() => chartData && fetchAIReading("tai_loc", chartData)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "tai_loc" ? theme.badgeActive : theme.badgeInactive}`}
                    >
                      <Coins className="w-3.5 h-3.5" /> Tài lộc
                    </button>
                    <button 
                      onClick={() => chartData && fetchAIReading("tinh_duyen", chartData)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "tinh_duyen" ? theme.badgeActive : theme.badgeInactive}`}
                    >
                      <Heart className="w-3.5 h-3.5" /> Tình duyên
                    </button>
                    <button 
                      onClick={() => chartData && fetchAIReading("van_han", chartData)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "van_han" ? theme.badgeActive : theme.badgeInactive}`}
                    >
                      <Zap className="w-3.5 h-3.5" /> Vận hạn {formData.viewYear}
                    </button>
                  </div>
                </div>

                <div className="text-stone-700 leading-relaxed min-h-[150px]">
                  {isReading ? (
                    <div className={`flex flex-col items-center justify-center h-full gap-3 py-10 ${theme.loaderText}`}>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="font-medium animate-pulse text-center px-4">Tinh tú đang hội tụ. AI đang phân tích...</p>
                    </div>
                  ) : (
                    renderAIReadingContent(aiReading)
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}

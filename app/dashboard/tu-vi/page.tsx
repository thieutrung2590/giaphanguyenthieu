"use client";

import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CalendarSearch,
  Clock,
  Heart,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { Lunar, Solar } from "lunar-javascript";
import Link from "next/link";
import { useMemo, useState } from "react";

// --- BỘ TỪ ĐIỂN DỊCH THUẬT CAN CHI ---
const CAN_MAP: Record<string, string> = { '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu', '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý' };
const CHI_MAP: Record<string, string> = { '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ', '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi' };

function translateToVN(str: string) {
  if (!str) return "";
  let res = str;
  Object.entries(CAN_MAP).forEach(([k, v]) => (res = res.replace(new RegExp(k, "g"), v)));
  Object.entries(CHI_MAP).forEach(([k, v]) => (res = res.replace(new RegExp(k, "g"), v)));
  return res;
}

// Component hỗ trợ bọc các ô Input kèm Icon
const InputWrapper = ({
  icon: Icon,
  children,
}: {
  icon: any;
  children: React.ReactNode;
}) => (
  <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border border-purple-100 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all duration-300">
    <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0 ml-0.5">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 px-3">{children}</div>
  </div>
);

// Danh sách 12 cung Tử vi
const CUNG_TU_VI = [
  "Tỵ", "Ngọ", "Mùi", "Thân",
  "Thìn", "", "", "Dậu",
  "Mão", "", "", "Tuất",
  "Dần", "Sửu", "Tý", "Hợi"
];
const CUNG_CHUC = [
  "Tật Ách", "Thiên Di", "Nô Bộc", "Quan Lộc",
  "Tài Bạch", "", "", "Điền Trạch",
  "Tử Tức", "", "", "Phúc Đức",
  "Phu Thê", "Huynh Đệ", "Mệnh", "Phụ Mẫu"
];

export default function TuViPage() {
  const [formData, setFormData] = useState({
    name: "Nguyễn Thiệu",
    day: "05",
    month: "5",
    year: "1999",
    calendar: "Âm lịch",
    time: "Tỵ (09:00 - 11:00)",
    gender: "Nam giới",
    viewYear: "2026",
    job: "",
    relationship: "",
  });

  // State quản lý việc hiển thị kết quả
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.year) {
      alert("Vui lòng nhập đủ Họ tên và Năm sinh!");
      return;
    }
    
    setIsLoading(true);
    // Giả lập thời gian tính toán lập lá số (1.5 giây)
    setTimeout(() => {
      setIsLoading(false);
      setShowResult(true);
    }, 1500);
  };

  // Tự động tính toán Can Chi của Năm Sinh
  const canChiText = useMemo(() => {
    if (!formData.year) return "";

    const y = parseInt(formData.year);
    const m = formData.month ? parseInt(formData.month) : 1;
    const d = formData.day ? parseInt(formData.day) : 1;

    try {
      let lunarObj;
      if (formData.calendar === "Dương lịch") {
        const solar = Solar.fromYmd(y, m, d);
        lunarObj = solar.getLunar() as any;
      } else {
        lunarObj = Lunar.fromYmd(y, m, d) as any;
      }
      
      const ganZhi = lunarObj.getYearInGanZhi();
      return `Năm ${translateToVN(ganZhi)}`;
    } catch (e) {
      return "";
    }
  }, [formData.year, formData.month, formData.day, formData.calendar]);

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-300/30 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Card */}
      <div className="relative w-full max-w-4xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-purple-900/10">
        
        {/* =========================================
                      MÀN HÌNH NHẬP LIỆU 
            ========================================= */}
        {!showResult ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-purple-950 mb-3 tracking-tight">
                Lập lá số Tử Vi
              </h1>
              <p className="text-purple-700/80 text-sm sm:text-base font-medium">
                Khám phá vận mệnh - Định hướng tương lai
              </p>
            </div>

            <div className="space-y-4">
              <InputWrapper icon={User}>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Họ và tên"
                  className="w-full bg-transparent outline-none text-stone-700 font-semibold placeholder:font-normal placeholder:text-stone-400"
                />
              </InputWrapper>

              <div className="relative">
                <InputWrapper icon={CalendarDays}>
                  <div className="flex items-center w-full text-stone-700 text-sm font-medium divide-x divide-purple-100">
                    <select name="day" value={formData.day} onChange={handleChange} className="bg-transparent outline-none cursor-pointer w-full pr-2 appearance-none">
                      <option value="">Ngày</option>
                      {Array.from({ length: 31 }).map((_, i) => <option key={i} value={i + 1}>Ngày {i + 1}</option>)}
                    </select>
                    <select name="month" value={formData.month} onChange={handleChange} className="bg-transparent outline-none cursor-pointer w-full px-2 appearance-none">
                      <option value="">Tháng</option>
                      {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
                    </select>
                    <select name="year" value={formData.year} onChange={handleChange} className="bg-transparent outline-none cursor-pointer w-full px-2 appearance-none">
                      <option value="">Năm</option>
                      {Array.from({ length: 100 }).map((_, i) => {
                        const y = new Date().getFullYear() - i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                    <select name="calendar" value={formData.calendar} onChange={handleChange} className="bg-transparent outline-none cursor-pointer w-full pl-2 appearance-none text-purple-700 font-bold">
                      <option value="Dương lịch">Dương lịch</option>
                      <option value="Âm lịch">Âm lịch</option>
                    </select>
                  </div>
                </InputWrapper>

                {canChiText && (
                  <div className="absolute -bottom-2 right-4 translate-y-full flex items-center justify-end pointer-events-none z-10">
                    <span className="text-[11px] sm:text-xs font-bold text-fuchsia-700 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-fuchsia-200 shadow-sm shadow-fuchsia-100">
                      {canChiText}
                    </span>
                  </div>
                )}
              </div>

              <div className="h-4"></div>

              <InputWrapper icon={Clock}>
                <select name="time" value={formData.time} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none">
                  <option value="">Giờ sinh</option>
                  <option value="Tý (23:00 - 01:00)">Tý (23:00 - 01:00)</option>
                  <option value="Sửu (01:00 - 03:00)">Sửu (01:00 - 03:00)</option>
                  <option value="Dần (03:00 - 05:00)">Dần (03:00 - 05:00)</option>
                  <option value="Mão (05:00 - 07:00)">Mão (05:00 - 07:00)</option>
                  <option value="Thìn (07:00 - 09:00)">Thìn (07:00 - 09:00)</option>
                  <option value="Tỵ (09:00 - 11:00)">Tỵ (09:00 - 11:00)</option>
                  <option value="Ngọ (11:00 - 13:00)">Ngọ (11:00 - 13:00)</option>
                  <option value="Mùi (13:00 - 15:00)">Mùi (13:00 - 15:00)</option>
                  <option value="Thân (15:00 - 17:00)">Thân (15:00 - 17:00)</option>
                  <option value="Dậu (17:00 - 19:00)">Dậu (17:00 - 19:00)</option>
                  <option value="Tuất (19:00 - 21:00)">Tuất (19:00 - 21:00)</option>
                  <option value="Hợi (21:00 - 23:00)">Hợi (21:00 - 23:00)</option>
                </select>
              </InputWrapper>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWrapper icon={Users}>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none">
                    <option value="">Giới tính</option>
                    <option value="Nam giới">Nam giới</option>
                    <option value="Nữ giới">Nữ giới</option>
                  </select>
                </InputWrapper>

                <InputWrapper icon={CalendarSearch}>
                  <select name="viewYear" value={formData.viewYear} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none">
                    <option value="">Năm xem</option>
                    <option value="2026">Năm xem 2026</option>
                    <option value="2027">Năm xem 2027</option>
                  </select>
                </InputWrapper>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWrapper icon={Briefcase}>
                  <select name="job" value={formData.job} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none">
                    <option value="" disabled hidden>Tình trạng công việc</option>
                    <option value="Đang đi học">Đang đi học</option>
                    <option value="Đang đi làm">Đang đi làm</option>
                    <option value="Kinh doanh tự do">Kinh doanh tự do</option>
                  </select>
                </InputWrapper>

                <InputWrapper icon={Heart}>
                  <select name="relationship" value={formData.relationship} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none">
                    <option value="" disabled hidden>Tình trạng mối quan hệ</option>
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đang hẹn hò">Đang hẹn hò</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                  </select>
                </InputWrapper>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Đang lập lá số...
                  </>
                ) : (
                  "Xem luận giải"
                )}
              </button>

              <p className="text-center text-sm text-stone-500 mt-6 font-medium">
                Bạn có thể xem lá số minh họa{" "}
                <Link href="#" className="text-fuchsia-600 font-bold hover:underline">
                  Tại đây
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* =========================================
                        MÀN HÌNH KẾT QUẢ 
             ========================================= */
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setShowResult(false)}
                className="flex items-center gap-2 text-stone-500 hover:text-purple-700 font-medium transition-colors bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </button>
              <h2 className="text-2xl font-bold text-purple-900">Lá số Tử vi</h2>
              <div className="w-24"></div> {/* Spacer */}
            </div>

            {/* Layout 12 cung (Grid 4x4) */}
            <div className="grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2 max-w-4xl mx-auto h-[600px] sm:h-[700px] bg-stone-200/50 p-2 rounded-xl border border-stone-300">
              {CUNG_TU_VI.map((cung, i) => {
                const isCenter = cung === ""; // 4 ô ở giữa (Thiên bàn)
                
                // Trả về Thiên bàn (4 ô ghép lại thành 1)
                if (i === 5) {
                  return (
                    <div key={i} className="col-span-2 row-span-2 bg-[#fffcfa] rounded-lg shadow-inner flex flex-col items-center justify-center border-2 border-purple-200 p-4 text-center">
                      <h3 className="text-2xl font-bold text-red-700 uppercase mb-2">{formData.name}</h3>
                      <p className="text-sm font-semibold text-stone-700 mb-1">
                        Sinh ngày: <span className="text-purple-700">{formData.day}/{formData.month}/{formData.year}</span> ({formData.calendar})
                      </p>
                      <p className="text-sm font-semibold text-stone-700 mb-1">Giờ sinh: <span className="text-purple-700">{formData.time}</span></p>
                      <p className="text-sm font-semibold text-stone-700 mb-4">Giới tính: <span className="text-purple-700">{formData.gender}</span></p>
                      
                      <div className="w-full max-w-xs grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-left bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <p><span className="text-stone-500">Năm:</span> <strong className="text-stone-800">{canChiText.replace("Năm ", "")}</strong></p>
                        <p><span className="text-stone-500">Bản mệnh:</span> <strong className="text-stone-800">Đang tính...</strong></p>
                        <p><span className="text-stone-500">Cục:</span> <strong className="text-stone-800">Đang tính...</strong></p>
                        <p><span className="text-stone-500">Âm Dương:</span> <strong className="text-stone-800">Đang tính...</strong></p>
                      </div>
                    </div>
                  );
                }
                
                // Bỏ qua các ô bị Thiên bàn chiếm chỗ
                if (isCenter) return null;

                // Các cung bình thường
                const cungName = CUNG_CHUC[i];
                const isMenh = cungName === "Mệnh";
                const isThan = cungName === "Thân";
                
                return (
                  <div key={i} className={`relative bg-white rounded-lg border ${isMenh ? 'border-red-400 bg-red-50/30' : 'border-stone-200'} p-2 flex flex-col justify-between shadow-sm overflow-hidden`}>
                    {/* Tên cung & Vị trí (Tý, Sửu...) */}
                    <div className="flex justify-between items-start border-b border-stone-100 pb-1 mb-1">
                      <span className={`text-[13px] sm:text-[15px] font-bold ${isMenh || isThan ? 'text-red-600' : 'text-stone-700'}`}>
                        {cungName}
                      </span>
                      <span className="text-xs text-stone-400 font-medium">{cung}</span>
                    </div>

                    {/* Các Sao chính (Giả lập trống) */}
                    <div className="flex-1 text-[11px] sm:text-xs text-stone-500 font-medium space-y-0.5 mt-1">
                      {isMenh && <div className="text-red-500">- (Chính tinh)</div>}
                    </div>

                    {/* Các Sao phụ (Giả lập trống) */}
                    <div className="flex justify-between items-end mt-2 pt-1 border-t border-stone-100 text-[10px] text-stone-400">
                      <span>- (Vòng tràng sinh)</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-center text-sm text-stone-500 mt-4">
              * Đây là giao diện hiển thị mẫu. Để an sao tự động cần tích hợp thư viện chuyên sâu về Tử vi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

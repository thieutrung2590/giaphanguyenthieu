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
// Import thư viện tuvi-neo
import { generateLaSo } from "tuvi-neo";

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

// Cấu trúc Form Input
const InputWrapper = ({ icon: Icon, children }: { icon: any; children: React.ReactNode; }) => (
  <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border border-purple-100 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all duration-300">
    <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0 ml-0.5">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 px-3">{children}</div>
  </div>
);

// Bảng ánh xạ giờ (dùng cho form)
const TIME_MAP: Record<string, number> = { "Tý": 0, "Sửu": 2, "Dần": 4, "Mão": 6, "Thìn": 8, "Tỵ": 10, "Ngọ": 12, "Mùi": 14, "Thân": 16, "Dậu": 18, "Tuất": 20, "Hợi": 22 };

export default function TuViPage() {
  const [formData, setFormData] = useState({
    name: "Nguyễn Thiệu Trung",
    day: "25",
    month: "5",
    year: "1990",
    calendar: "Âm lịch",
    time: "Tỵ (09:00 - 11:00)",
    gender: "Nam giới",
    viewYear: "2026",
    job: "",
    relationship: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // Lưu trực tiếp kết quả trả về từ tuvi-neo
  const [chartData, setChartData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.year || !formData.time) {
      alert("Vui lòng nhập đủ Họ tên, Năm sinh và Giờ sinh!");
      return;
    }
    
    setIsLoading(true);

    setTimeout(() => {
      try {
        const y = parseInt(formData.year);
        const m = parseInt(formData.month || "1");
        const d = parseInt(formData.day || "1");
        const timeKey = formData.time.split(" ")[0]; 
        const hour = TIME_MAP[timeKey] || 0; // Lấy giờ đại diện
        const isLunar = formData.calendar === "Âm lịch";

        // Gọi thư viện tuvi-neo
        const laso = generateLaSo({
          name: formData.name,
          gender: formData.gender === "Nam giới" ? 'male' : 'female',
          birth: {
            isLunar: isLunar,
            year: y,
            month: m,
            day: d,
            hour: hour,
            minute: 0, // Mặc định phút = 0
          },
        });

        // Xử lý lại mapping cung để in ra grid (tuvi-neo trả mảng 12 cung bắt đầu từ Dần (0) -> Sửu (11))
        // Cần map vào Grid 16 ô: Tý (0), Sửu (1), ..., Hợi (11) của Grid
        // Mapping từ 16 ô trên màn hình vào Index của Cung (Tý = 10, Sửu = 11, Dần = 0...)
        const GRID_TO_CUNG: Record<number, number> = { 
            0: 3, // Tỵ
            1: 4, // Ngọ
            2: 5, // Mùi
            3: 6, // Thân
            4: 2, // Thìn
            7: 7, // Dậu
            8: 1, // Mão
            11: 8, // Tuất
            12: 0, // Dần
            13: 11, // Sửu
            14: 10, // Tý
            15: 9 // Hợi 
        };

        const gridCacCung = Array(16).fill(null);
        Object.keys(GRID_TO_CUNG).forEach((gridIdxStr) => {
            const gridIdx = parseInt(gridIdxStr);
            const cungIdx = GRID_TO_CUNG[gridIdx];
            gridCacCung[gridIdx] = laso.Cac_cung[cungIdx];
        });

        setChartData({
            info: laso.Info,
            gridCung: gridCacCung
        });

        setIsLoading(false);
        setShowResult(true);
      } catch (error) {
        console.error(error);
        alert("Có lỗi khi lập lá số, vui lòng kiểm tra lại ngày tháng!");
        setIsLoading(false);
      }
    }, 1200);
  };

  const canChiText = useMemo(() => {
    if (!formData.year) return "";
    try {
      let lunarObj = formData.calendar === "Dương lịch" 
        ? (Solar.fromYmd(parseInt(formData.year), parseInt(formData.month || "1"), parseInt(formData.day || "1")).getLunar() as any)
        : (Lunar.fromYmd(parseInt(formData.year), parseInt(formData.month || "1"), parseInt(formData.day || "1")) as any);
      return `Năm ${translateToVN(lunarObj.getYearInGanZhi())}`;
    } catch (e) { return ""; }
  }, [formData.year, formData.month, formData.day, formData.calendar]);

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-300/30 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative w-full max-w-5xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-purple-900/10">
        
        {!showResult ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-purple-950 mb-3 tracking-tight">Lập lá số Tử Vi</h1>
              <p className="text-purple-700/80 text-sm sm:text-base font-medium">Khám phá vận mệnh - Định hướng tương lai</p>
            </div>

            <div className="space-y-4">
              <InputWrapper icon={User}>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và tên" className="w-full bg-transparent outline-none text-stone-700 font-semibold placeholder:font-normal placeholder:text-stone-400" />
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
                      {Array.from({ length: 100 }).map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
                    </select>
                    <select name="calendar" value={formData.calendar} onChange={handleChange} className="bg-transparent outline-none cursor-pointer w-full pl-2 appearance-none text-purple-700 font-bold">
                      <option value="Dương lịch">Dương lịch</option>
                      <option value="Âm lịch">Âm lịch</option>
                    </select>
                  </div>
                </InputWrapper>
                {canChiText && (
                  <div className="absolute -bottom-2 right-4 translate-y-full flex items-center justify-end pointer-events-none z-10">
                    <span className="text-[11px] sm:text-xs font-bold text-fuchsia-700 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-fuchsia-200 shadow-sm shadow-fuchsia-100">{canChiText}</span>
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
                onClick={handleSubmit} disabled={isLoading}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" />Đang lập lá số...</> : "Xem luận giải"}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button onClick={() => setShowResult(false)} className="flex items-center gap-2 text-stone-500 hover:text-purple-700 font-medium transition-colors bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <h2 className="text-2xl font-bold text-purple-900 hidden sm:block">Lá số Tử vi</h2>
              <div className="w-24"></div>
            </div>

            {/* Lưới Lá Số Tử Vi */}
            <div className="grid grid-cols-4 grid-rows-4 gap-1 sm:gap-2 max-w-5xl mx-auto h-[600px] sm:h-[750px] bg-stone-200/50 p-1.5 sm:p-2 rounded-xl border border-stone-300">
              {Array.from({ length: 16 }).map((_, i) => {
                const isCenter = [5, 6, 9, 10].includes(i);
                
                // Ô trung tâm (Thiên bàn)
                if (isCenter) {
                  if (i === 5) return (
                    <div key={i} className="col-span-2 row-span-2 bg-[#fffcfa] rounded-lg shadow-inner flex flex-col items-center justify-center border-2 border-purple-200 p-2 sm:p-4 text-center">
                      <h3 className="text-xl sm:text-2xl font-bold text-red-700 uppercase mb-2 line-clamp-1">{chartData?.info.Name}</h3>
                      <p className="text-[11px] sm:text-sm font-semibold text-stone-700 mb-1">
                        Sinh: <span className="text-purple-700">{formData.day}/{formData.month}/{formData.year}</span> ({formData.calendar})
                      </p>
                      <p className="text-[11px] sm:text-sm font-semibold text-stone-700 mb-1">Giờ sinh: <span className="text-purple-700">{formData.time.split(" ")[0]}</span></p>
                      
                      <div className="w-full max-w-[320px] grid grid-cols-2 gap-x-2 gap-y-1.5 sm:gap-y-2 text-[11px] sm:text-sm text-left bg-purple-50 p-2 sm:p-3 rounded-lg border border-purple-100 mt-4">
                        <p><span className="text-stone-500">Năm:</span> <strong className="text-stone-800">{chartData?.info.Nam}</strong></p>
                        <p><span className="text-stone-500">Bản mệnh:</span> <strong className="text-stone-800">{chartData?.info.BanMenh}</strong></p>
                        <p><span className="text-stone-500">Cục:</span> <strong className="text-stone-800">{chartData?.info.Cuc}</strong></p>
                        <p><span className="text-stone-500">Âm Dương:</span> <strong className="text-stone-800">{chartData?.info.AmDuong}</strong></p>
                      </div>
                    </div>
                  );
                  return null;
                }

                // 12 Cung xung quanh
                const house = chartData?.gridCung[i];
                if (!house) return <div key={i} className="bg-transparent" />; // Ô dự phòng

                const isMenh = house.Name === "Mệnh";
                const isThan = house.Than === 1;

                return (
                  <div key={i} className={`relative bg-white rounded-lg border ${isMenh ? 'border-red-400 bg-red-50/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' : 'border-stone-200'} p-1.5 sm:p-2 flex flex-col justify-between overflow-hidden hover:border-purple-300 transition-colors cursor-pointer group`}>
                    
                    {/* Header Cung */}
                    <div className="flex justify-between items-start border-b border-stone-100 pb-1 mb-1">
                      <span className={`text-[12px] sm:text-[14px] font-bold ${isMenh || isThan ? 'text-red-600' : 'text-stone-700'}`}>
                        {house.Name} {isThan && !isMenh ? <span className="text-[10px] sm:text-xs text-fuchsia-600 font-semibold">(Thân)</span> : ""}
                      </span>
                    </div>

                    {/* Danh sách Sao */}
                    <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-hide flex flex-col items-center">
                      {/* Chính tinh */}
                      <div className="flex flex-col items-center mb-1 w-full gap-0.5">
                        {house.ChinhTinh.map((star: any, idx: number) => (
                           <div key={`ct-${idx}`} className={`text-[11px] sm:text-[12px] font-bold uppercase tracking-tight text-red-600 w-full text-center flex justify-center items-center gap-1`}>
                             {star.Name}
                             {star.DacTinh && <span className="text-[9px] text-gray-400 lowercase font-normal">({star.DacTinh})</span>}
                           </div>
                        ))}
                      </div>
                      
                      {/* Phụ tinh tốt & xấu chia 2 cột */}
                      <div className="grid grid-cols-2 w-full gap-1 mt-1 border-t border-stone-50 pt-1">
                        <div className="flex flex-col items-start space-y-0.5">
                            {house.Saotot.map((star: any, idx: number) => (
                                <div key={`st-${idx}`} className="text-[10px] sm:text-[11px] font-medium text-stone-600 truncate w-full flex gap-1">
                                    {star.Name} {star.DacTinh && <span className="text-[8px] text-gray-400">({star.DacTinh})</span>}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col items-end space-y-0.5">
                            {house.Saoxau.map((star: any, idx: number) => (
                                <div key={`sx-${idx}`} className="text-[10px] sm:text-[11px] font-medium text-stone-500 truncate w-full text-right flex justify-end gap-1">
                                    {star.Name} {star.DacTinh && <span className="text-[8px] text-gray-400">({star.DacTinh})</span>}
                                </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Cung (Tràng sinh & Tuần Triệt) */}
                    <div className="flex justify-between items-end border-t border-stone-100 pt-1 mt-1">
                       <span className="text-[9px] sm:text-[10px] text-stone-400 font-medium">{house.TrangSinh}</span>
                    </div>

                    {/* Vòng Tuần Triệt */}
                    {(house.Tuan === 1 || house.Triet === 1) && (
                      <div className="absolute bottom-1 right-1 flex flex-col gap-0.5">
                        {house.Tuan === 1 && <div className="text-[9px] sm:text-[10px] font-bold text-white bg-slate-700 px-1 py-[1px] rounded-sm">Tuần</div>}
                        {house.Triet === 1 && <div className="text-[9px] sm:text-[10px] font-bold text-white bg-slate-900 px-1 py-[1px] rounded-sm">Triệt</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="text-center text-xs sm:text-sm text-stone-500 mt-5 font-medium">
              * Thuật toán an sao tự động bởi tuvi-neo. Tính toán hơn 140+ vì sao, Tứ hóa và Vòng Tràng sinh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

// --- BỘ TỪ ĐIỂN DỊCH THUẬT CAN CHI & BẢN MỆNH ---
const CAN_MAP: Record<string, string> = { '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu', '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý' };
const CHI_MAP: Record<string, string> = { '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ', '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi' };
const NAYIN_MAP: Record<string, string> = {
  '海中金': 'Hải trung kim', '炉中火': 'Lư trung hỏa', '大林木': 'Đại lâm mộc', '路旁土': 'Lộ bàng thổ',
  '剑锋金': 'Kiếm phong kim', '山头火': 'Sơn đầu hỏa', '涧下水': 'Giản hạ thủy', '城头土': 'Thành đầu thổ',
  '白蜡金': 'Bạch lạp kim', '杨柳木': 'Dương liễu mộc', '泉中水': 'Tuyền trung thủy', '屋上土': 'Ốc thượng thổ',
  '霹雳火': 'Tích lịch hỏa', '松柏木': 'Tùng bách mộc', '长流水': 'Trường lưu thủy', '沙中金': 'Sa trung kim',
  '山下火': 'Sơn hạ hỏa', '平地木': 'Bình địa mộc', '壁上土': 'Bích thượng thổ', '金箔金': 'Kim bạch kim',
  '覆灯火': 'Phú đăng hỏa', '天河水': 'Thiên hà thủy', '大驿土': 'Đại trạch thổ', '钗钏金': 'Thoa xuyến kim',
  '桑柘木': 'Tang đố mộc', '大溪水': 'Đại khê thủy', '沙中土': 'Sa trung thổ', '天上火': 'Thiên thượng hỏa',
  '石榴木': 'Thạch lựu mộc', '大海水': 'Đại hải thủy'
};

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

// --- ENGINE TÍNH TOÁN LÁ SỐ TỬ VI ---
const TIME_MAP: Record<string, number> = { "Tý": 1, "Sửu": 2, "Dần": 3, "Mão": 4, "Thìn": 5, "Tỵ": 6, "Ngọ": 7, "Mùi": 8, "Thân": 9, "Dậu": 10, "Tuất": 11, "Hợi": 12 };
const HOUSES = ["Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc", "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ"];
const CUNG_NAMES = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
// Mapping từ 16 ô trên màn hình vào Index của Cung (Tý = 0, Sửu = 1...)
const GRID_TO_CUNG: Record<number, number> = { 0: 5, 1: 6, 2: 7, 3: 8, 4: 4, 7: 9, 8: 3, 11: 10, 12: 2, 13: 1, 14: 0, 15: 11 };

// Bảng tính Ngũ Hành Cục
const CAN_YEAR_MAP: Record<string, number> = { 'Giáp': 1, 'Kỷ': 1, 'Ất': 2, 'Canh': 2, 'Bính': 3, 'Tân': 3, 'Đinh': 4, 'Nhâm': 4, 'Mậu': 5, 'Quý': 5 };
const CHI_MENH_MAP: Record<number, number> = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 }; 
const CUC_MAP: Record<number, string> = { 1: "Thủy Nhị Cục", 2: "Hỏa Lục Cục", 3: "Thổ Ngũ Cục", 4: "Kim Tứ Cục", 5: "Mộc Tam Cục" };
const YANG_CANS = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"];

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

    // Tính toán lá số
    setTimeout(() => {
      try {
        const y = parseInt(formData.year);
        const m = parseInt(formData.month || "1");
        const d = parseInt(formData.day || "1");

        let lunarObj;
        if (formData.calendar === "Dương lịch") {
          const solar = Solar.fromYmd(y, m, d);
          lunarObj = solar.getLunar() as any;
        } else {
          lunarObj = Lunar.fromYmd(y, m, d) as any;
        }

        const lunarMonth = Math.abs(lunarObj.getMonth());
        const timeKey = formData.time.split(" ")[0]; // Lấy chữ "Tỵ"
        const lunarHour = TIME_MAP[timeKey] || 1;

        // Vị trí Cung Mệnh & Thân (0 = Tý)
        const menhIndex = (2 + (lunarMonth - 1) - (lunarHour - 1) + 12) % 12;
        const thanIndex = (2 + (lunarMonth - 1) + (lunarHour - 1)) % 12;

        // Gán 12 Cung Chức
        const housesData: Record<number, any> = {};
        for (let i = 0; i < 12; i++) {
          const idx = (menhIndex + i) % 12;
          housesData[idx] = {
            name: HOUSES[i],
            isThan: idx === thanIndex,
            chinhTinh: [], 
            phuTinh: []
          };
        }

        // Thông tin Thiên Bàn
        const yearCanStr = translateToVN(lunarObj.getYearGan());
        const isYang = YANG_CANS.includes(yearCanStr);
        const amDuongStr = isYang 
            ? (formData.gender === "Nam giới" ? "Dương Nam" : "Dương Nữ")
            : (formData.gender === "Nam giới" ? "Âm Nam" : "Âm Nữ");

        const canVal = CAN_YEAR_MAP[yearCanStr] || 1;
        const chiVal = CHI_MENH_MAP[menhIndex];
        let sumVal = canVal + chiVal;
        if (sumVal > 5) sumVal -= 5;
        const cucStr = CUC_MAP[sumVal];

        const banMenhStr = NAYIN_MAP[lunarObj.getYearNaYin()] || lunarObj.getYearNaYin();

        setChartData({
          houses: housesData,
          thienBan: {
            namCanChi: `Năm ${yearCanStr} ${translateToVN(lunarObj.getYearZhi())}`,
            banMenh: banMenhStr,
            cuc: cucStr,
            amDuong: amDuongStr
          }
        });

        setIsLoading(false);
        setShowResult(true);
      } catch (error) {
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

      <div className="relative w-full max-w-4xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-purple-900/10">
        
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
                  {Object.keys(TIME_MAP).map(k => (
                    <option key={k} value={`${k} (${(TIME_MAP[k]*2 - 1) % 24}:00 - ${TIME_MAP[k]*2 + 1}:00)`}>{`${k} (${(TIME_MAP[k]*2 - 1 === -1 ? 23 : (TIME_MAP[k]*2 - 1).toString().padStart(2, '0'))}:00 - ${(TIME_MAP[k]*2 + 1).toString().padStart(2, '0')}:00)`}</option>
                  ))}
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
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowResult(false)} className="flex items-center gap-2 text-stone-500 hover:text-purple-700 font-medium transition-colors bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <h2 className="text-2xl font-bold text-purple-900 hidden sm:block">Lá số Tử vi</h2>
              <div className="w-24"></div>
            </div>

            {/* Lưới Lá Số Tử Vi */}
            <div className="grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2 max-w-4xl mx-auto h-[600px] sm:h-[700px] bg-stone-200/50 p-2 rounded-xl border border-stone-300">
              {Array.from({ length: 16 }).map((_, i) => {
                const isCenter = [5, 6, 9, 10].includes(i);
                
                // Ô trung tâm (Thiên bàn)
                if (isCenter) {
                  if (i === 5) return (
                    <div key={i} className="col-span-2 row-span-2 bg-[#fffcfa] rounded-lg shadow-inner flex flex-col items-center justify-center border-2 border-purple-200 p-2 sm:p-4 text-center">
                      <h3 className="text-xl sm:text-2xl font-bold text-red-700 uppercase mb-2 line-clamp-1">{formData.name}</h3>
                      <p className="text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                        Sinh: <span className="text-purple-700">{formData.day}/{formData.month}/{formData.year}</span> ({formData.calendar})
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-stone-700 mb-1">Giờ sinh: <span className="text-purple-700">{formData.time.split(" ")[0]}</span></p>
                      <p className="text-xs sm:text-sm font-semibold text-stone-700 mb-4">Giới tính: <span className="text-purple-700">{formData.gender}</span></p>
                      
                      <div className="w-full max-w-[280px] grid grid-cols-2 gap-x-2 gap-y-1 sm:gap-y-2 text-[11px] sm:text-[13px] text-left bg-purple-50 p-2 sm:p-3 rounded-lg border border-purple-100">
                        <p><span className="text-stone-500">Năm:</span> <strong className="text-stone-800">{chartData?.thienBan.namCanChi}</strong></p>
                        <p><span className="text-stone-500">Mệnh:</span> <strong className="text-stone-800">{chartData?.thienBan.banMenh}</strong></p>
                        <p><span className="text-stone-500">Cục:</span> <strong className="text-stone-800">{chartData?.thienBan.cuc}</strong></p>
                        <p><span className="text-stone-500">Âm Dương:</span> <strong className="text-stone-800">{chartData?.thienBan.amDuong}</strong></p>
                      </div>
                    </div>
                  );
                  return null;
                }

                // 12 Cung xung quanh
                const cungIdx = GRID_TO_CUNG[i];
                const cungName = CUNG_NAMES[cungIdx];
                const house = chartData?.houses[cungIdx];
                const isMenh = house?.name === "Mệnh";
                const isThan = house?.isThan;

                return (
                  <div key={i} className={`relative bg-white rounded-lg border ${isMenh ? 'border-red-400 bg-red-50/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' : 'border-stone-200'} p-1.5 sm:p-2 flex flex-col justify-between overflow-hidden hover:border-purple-300 transition-colors cursor-pointer group`}>
                    <div className="flex justify-between items-start border-b border-stone-100 pb-1 mb-1">
                      <span className={`text-[12px] sm:text-[15px] font-bold ${isMenh || isThan ? 'text-red-600' : 'text-stone-700'}`}>
                        {house?.name} {isThan && !isMenh ? <span className="text-[10px] sm:text-xs text-fuchsia-600 font-semibold">(Thân)</span> : ""}
                      </span>
                      <span className="text-[10px] sm:text-xs text-stone-400 font-medium px-1 bg-stone-50 rounded">{cungName}</span>
                    </div>

                    <div className="flex-1 text-[10px] sm:text-[11px] font-medium space-y-0.5 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      {/* Vị trí để truyền thư viện hiển thị Chính Tinh (Tử Vi, Thiên Cơ, Thái Dương...) */}
                      <p className="text-stone-400 italic">...Đang cập nhật sao</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-center text-xs sm:text-sm text-stone-500 mt-5 font-medium">
              * Engine đã tự động tính chính xác Mệnh, Thân, Ngũ Hành Cục và vị trí 12 Cung. Để xuất hiện 108 vì sao, bạn chỉ cần gài gói dữ liệu an sao vào mảng `chinhTinh` và `phuTinh`.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

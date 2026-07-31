"use client";

import { ArrowLeft, Briefcase, CalendarDays, CalendarSearch, Clock, Heart, Loader2, Sparkles, User, Users } from "lucide-react";
import { Lunar, Solar } from "lunar-javascript";
import Link from "next/link";
import { useMemo, useState } from "react";
import { generateLaSo } from "tuvi-neo";
import { getLuangiaiAI } from "./action";

// --- TỪ ĐIỂN CAN CHI ---
const CAN_MAP: Record<string, string> = { '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu', '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý' };
const CHI_MAP: Record<string, string> = { '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ', '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi' };

// --- BỘ TỪ ĐIỂN 60 HOA GIÁP & NGŨ HÀNH NẠP ÂM (Để tự động tra cứu Bản Mệnh) ---
const NGU_HANH_NAP_AM: Record<string, string> = {
  "giáp tý": "Hải Trung Kim", "ất sửu": "Hải Trung Kim", "bính dần": "Lư Trung Hỏa", "đinh mão": "Lư Trung Hỏa",
  "mậu thìn": "Đại Lâm Mộc", "kỷ tỵ": "Đại Lâm Mộc", "canh ngọ": "Lộ Bàng Thổ", "tân mùi": "Lộ Bàng Thổ",
  "nhâm thân": "Kiếm Phong Kim", "quý dậu": "Kiếm Phong Kim", "giáp tuất": "Sơn Đầu Hỏa", "ất hợi": "Sơn Đầu Hỏa",
  "bính tý": "Giản Hạ Thủy", "đinh sửu": "Giản Hạ Thủy", "mậu dần": "Thành Đầu Thổ", "kỷ mão": "Thành Đầu Thổ",
  "canh thìn": "Bạch Lạp Kim", "tân tỵ": "Bạch Lạp Kim", "nhâm ngọ": "Dương Liễu Mộc", "quý mùi": "Dương Liễu Mộc",
  "giáp thân": "Tuyền Trung Thủy", "ất dậu": "Tuyền Trung Thủy", "bính tuất": "Ốc Thượng Thổ", "đinh hợi": "Ốc Thượng Thổ",
  "mậu tý": "Thích Lịch Hỏa", "kỷ sửu": "Thích Lịch Hỏa", "canh dần": "Tùng Bách Mộc", "tân mão": "Tùng Bách Mộc",
  "nhâm thìn": "Trường Lưu Thủy", "quý tỵ": "Trường Lưu Thủy", "giáp ngọ": "Sa Trung Kim", "ất mùi": "Sa Trung Kim",
  "bính thân": "Sơn Hạ Hỏa", "đinh dậu": "Sơn Hạ Hỏa", "mậu tuất": "Bình Địa Mộc", "kỷ hợi": "Bình Địa Mộc",
  "canh tý": "Bích Thượng Thổ", "tân sửu": "Bích Thượng Thổ", "nhâm dần": "Kim Bạch Kim", "quý mão": "Kim Bạch Kim",
  "giáp thìn": "Phú Đăng Hỏa", "ất tỵ": "Phú Đăng Hỏa", "bính ngọ": "Thiên Hà Thủy", "đinh mùi": "Thiên Hà Thủy",
  "mậu thân": "Đại Trạch Thổ", "kỷ dậu": "Đại Trạch Thổ", "canh tuất": "Thoa Xuyến Kim", "tân hợi": "Thoa Xuyến Kim",
  "nhâm tý": "Tang Đố Mộc", "quý sửu": "Tang Đố Mộc", "giáp dần": "Đại Khê Thủy", "ất mão": "Đại Khê Thủy",
  "bính thìn": "Sa Trung Thổ", "đinh tỵ": "Sa Trung Thổ", "mậu ngọ": "Thiên Thượng Hỏa", "kỷ mùi": "Thiên Thượng Hỏa",
  "canh thân": "Thạch Lựu Mộc", "tân dậu": "Thạch Lựu Mộc", "nhâm tuất": "Đại Hải Thủy", "quý hợi": "Đại Hải Thủy"
};

// Hàm dò tìm Bản Mệnh chuẩn xác 100%
function getBanMenhFallback(canChi: string) {
  if (!canChi) return "Chưa xác định";
  const key = canChi.toLowerCase().replace("năm", "").trim();
  return NGU_HANH_NAP_AM[key] || "Chưa xác định";
}

const TIME_OPTIONS = [
  { label: "Tý (23:00 - 01:00)", hour: 0 }, { label: "Sửu (01:00 - 03:00)", hour: 2 },
  { label: "Dần (03:00 - 05:00)", hour: 4 }, { label: "Mão (05:00 - 07:00)", hour: 6 },
  { label: "Thìn (07:00 - 09:00)", hour: 8 }, { label: "Tỵ (09:00 - 11:00)", hour: 10 },
  { label: "Ngọ (11:00 - 13:00)", hour: 12 }, { label: "Mùi (13:00 - 15:00)", hour: 14 },
  { label: "Thân (15:00 - 17:00)", hour: 16 }, { label: "Dậu (17:00 - 19:00)", hour: 18 },
  { label: "Tuất (19:00 - 21:00)", hour: 20 }, { label: "Hợi (21:00 - 23:00)", hour: 22 },
];

function translateToVN(str: string) {
  let res = str || "";
  Object.entries(CAN_MAP).forEach(([k, v]) => (res = res.replace(new RegExp(k, "g"), v)));
  Object.entries(CHI_MAP).forEach(([k, v]) => (res = res.replace(new RegExp(k, "g"), v)));
  return res;
}

const InputWrapper = ({ icon: Icon, children }: { icon: any; children: React.ReactNode; }) => (
  <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border border-purple-100 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all duration-300">
    <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0 ml-0.5"><Icon className="w-5 h-5" /></div>
    <div className="flex-1 px-3">{children}</div>
  </div>
);

// Tên 12 cung Địa Chi cố định trên Lưới
const CHI_OF_GRID: Record<number, string> = { 0: "Tỵ", 1: "Ngọ", 2: "Mùi", 3: "Thân", 4: "Thìn", 7: "Dậu", 8: "Mão", 11: "Tuất", 12: "Dần", 13: "Sửu", 14: "Tý", 15: "Hợi" };

export default function TuViPage() {
  const [formData, setFormData] = useState({
    name: "Nguyễn Thiệu", day: "25", month: "5", year: "1990", calendar: "Âm lịch", time: "Tỵ (09:00 - 11:00)", gender: "Nam giới", viewYear: "2026", job: "", relationship: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [aiReading, setAiReading] = useState("");
  const [isReading, setIsReading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.year || !formData.time) return alert("Vui lòng nhập đủ thông tin!");
    
    setIsLoading(true);
    setAiReading("");

    setTimeout(async () => {
      try {
        const y = parseInt(formData.year), m = parseInt(formData.month || "1"), d = parseInt(formData.day || "1");
        const selectedTimeObj = TIME_OPTIONS.find(t => t.label === formData.time);
        const hour = selectedTimeObj ? selectedTimeObj.hour : 10;

        const laso = generateLaSo({
          name: formData.name,
          gender: formData.gender === "Nam giới" ? 'male' : 'female',
          birth: { isLunar: formData.calendar === "Âm lịch", year: y, month: m, day: d, hour: hour, minute: 0 },
        });

        const GRID_TO_CUNG: Record<number, number> = { 
          0: 5, 1: 6, 2: 7, 3: 8, 4: 4, 7: 9, 8: 3, 11: 10, 12: 2, 13: 1, 14: 0, 15: 11 
        };
        
        const gridCacCung = Array(16).fill(null);
        Object.keys(GRID_TO_CUNG).forEach((str) => {
            const gridIdx = parseInt(str);
            gridCacCung[gridIdx] = laso.Cac_cung[GRID_TO_CUNG[gridIdx]];
        });

        const rawInfo = (laso as any).Info || (laso as any).info || {};
        
        // Lấy tên Năm (Ví dụ: Canh Ngọ)
        const namCanChi = rawInfo.Nam || rawInfo.nam || rawInfo.namCanChi || "Chưa xác định";
        
        // So khớp từ điển để lấy đúng Bản Mệnh
        const computedBanMenh = getBanMenhFallback(namCanChi);
        const finalBanMenh = computedBanMenh !== "Chưa xác định" ? computedBanMenh : (rawInfo.nguHanh || rawInfo.NguHanh || rawInfo.ban_menh || rawInfo.BanMenh || rawInfo.menh || "Chưa xác định");

        const safeInfo = {
          Name: formData.name,
          Nam: namCanChi,
          BanMenh: finalBanMenh,
          Cuc: rawInfo.cuc || rawInfo.Cuc || "Chưa xác định",
          AmDuong: rawInfo.amDuong || rawInfo.AmDuong || "Chưa xác định"
        };

        const newChartData = { info: safeInfo, gridCung: gridCacCung };
        setChartData(newChartData);
        setShowResult(true);
        setIsLoading(false);

        setIsReading(true);

        const menhCung = gridCacCung.find((c: any) => c && c.Name === "Mệnh");
        const chinhTinhMenh = menhCung?.ChinhTinh.map((s: any) => s.Name).join(", ") || "Không có chính tinh (Vô Chính Diệu)";

        const aiPromptData = {
          name: safeInfo.Name,
          gender: formData.gender,
          amDuong: safeInfo.AmDuong,
          banMenh: safeInfo.BanMenh,
          cuc: safeInfo.Cuc,
          chinhTinh: chinhTinhMenh
        };

        const readingResult = await getLuangiaiAI(aiPromptData);
        setAiReading(readingResult);
        setIsReading(false);

      } catch (error) {
        alert("Lỗi lập lá số, kiểm tra lại ngày tháng!");
        setIsLoading(false);
      }
    }, 1000);
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
              <InputWrapper icon={User}><input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và tên" className="w-full bg-transparent outline-none text-stone-700 font-semibold" /></InputWrapper>
              
              <div className="relative">
                <InputWrapper icon={CalendarDays}>
                  <div className="flex items-center w-full text-stone-700 text-sm font-medium divide-x divide-purple-100">
                    <select name="day" value={formData.day} onChange={handleChange} className="bg-transparent outline-none w-full pr-2"><option value="">Ngày</option>{Array.from({ length: 31 }).map((_, i) => <option key={i} value={i + 1}>Ngày {i + 1}</option>)}</select>
                    <select name="month" value={formData.month} onChange={handleChange} className="bg-transparent outline-none w-full px-2"><option value="">Tháng</option>{Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}</select>
                    <select name="year" value={formData.year} onChange={handleChange} className="bg-transparent outline-none w-full px-2"><option value="">Năm</option>{Array.from({ length: 100 }).map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}</select>
                    <select name="calendar" value={formData.calendar} onChange={handleChange} className="bg-transparent outline-none w-full pl-2 text-purple-700 font-bold"><option value="Dương lịch">Dương lịch</option><option value="Âm lịch">Âm lịch</option></select>
                  </div>
                </InputWrapper>
                {canChiText && <div className="absolute -bottom-2 right-4 translate-y-full flex items-center z-10"><span className="text-xs font-bold text-fuchsia-700 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-fuchsia-200">{canChiText}</span></div>}
              </div>
              <div className="h-4"></div>
              
              <InputWrapper icon={Clock}>
                <select name="time" value={formData.time} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer">
                  <option value="">Giờ sinh</option>
                  {TIME_OPTIONS.map(t => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </InputWrapper>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWrapper icon={Users}><select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold"><option value="Nam giới">Nam giới</option><option value="Nữ giới">Nữ giới</option></select></InputWrapper>
                <InputWrapper icon={CalendarSearch}><select name="viewYear" value={formData.viewYear} onChange={handleChange} className="w-full bg-transparent outline-none text-stone-700 font-semibold"><option value="2026">Năm xem 2026</option></select></InputWrapper>
              </div>

              <button onClick={handleSubmit} disabled={isLoading} className="w-full mt-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2">
                {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" />Đang lập lá số...</> : "Xem luận giải"}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button onClick={() => setShowResult(false)} className="flex items-center gap-2 text-stone-500 hover:text-purple-700 font-medium bg-white px-4 py-2 rounded-xl border border-stone-200">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <h2 className="text-2xl font-bold text-purple-900 hidden sm:block">Lá số Tử vi</h2>
              <div className="w-24"></div>
            </div>

            {/* Lưới Lá Số */}
            <div className="grid grid-cols-4 grid-rows-4 gap-1 sm:gap-2 max-w-5xl mx-auto h-[600px] sm:h-[750px] bg-stone-200/50 p-1.5 sm:p-2 rounded-xl border border-stone-300">
              {Array.from({ length: 16 }).map((_, i) => {
                const isCenter = [5, 6, 9, 10].includes(i);
                if (isCenter) {
                  if (i === 5) return (
                    <div key={i} className="col-span-2 row-span-2 bg-[#fffcfa] rounded-lg shadow-inner flex flex-col items-center justify-center border-2 border-purple-200 p-2 sm:p-4 text-center">
                      <h3 className="text-xl sm:text-2xl font-bold text-red-700 uppercase mb-2">{chartData?.info.Name}</h3>
                      <p className="text-[11px] sm:text-sm font-semibold text-stone-700 mb-1">Sinh: <span className="text-purple-700">{formData.day}/{formData.month}/{formData.year}</span></p>
                      
                      <div className="w-full max-w-[320px] grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] sm:text-sm text-left bg-purple-50 p-2 sm:p-3 rounded-lg border border-purple-100 mt-4">
                        <p><span className="text-stone-500">Năm:</span> <strong className="text-stone-800">{chartData?.info.Nam}</strong></p>
                        <p><span className="text-stone-500">Mệnh:</span> <strong className="text-stone-800">{chartData?.info.BanMenh}</strong></p>
                        <p><span className="text-stone-500">Cục:</span> <strong className="text-stone-800">{chartData?.info.Cuc}</strong></p>
                        <p><span className="text-stone-500">Âm Dương:</span> <strong className="text-stone-800">{chartData?.info.AmDuong}</strong></p>
                      </div>
                    </div>
                  );
                  return null;
                }

                const house = chartData?.gridCung[i];
                if (!house) return <div key={i} className="bg-transparent" />;
                const isMenh = house.Name === "Mệnh";
                const isThan = house.Than === 1;

                return (
                  <div key={i} className={`relative bg-white rounded-lg border ${isMenh ? 'border-red-400 bg-red-50/20 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' : 'border-stone-200'} p-1.5 flex flex-col justify-between overflow-hidden`}>
                    <div className="flex justify-between items-start border-b border-stone-100 pb-1 mb-1">
                      <span className={`text-[12px] sm:text-[14px] font-bold ${isMenh || isThan ? 'text-red-600' : 'text-stone-700'}`}>
                        {house.Name} {isThan && !isMenh ? <span className="text-[10px] text-fuchsia-600">(Thân)</span> : ""}
                      </span>
                      <span className="text-[10px] text-stone-400 font-semibold bg-stone-50 px-1 rounded-sm">{CHI_OF_GRID[i]}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-0.5 flex flex-col items-center scrollbar-hide">
                      <div className="flex flex-col items-center mb-1 w-full gap-0.5">
                        {house.ChinhTinh.map((star: any, idx: number) => (
                           <div key={`ct-${idx}`} className={`text-[11px] sm:text-[12px] font-bold uppercase text-red-600 flex gap-1`}>{star.Name} {star.DacTinh && <span className="text-[9px] text-gray-400 lowercase font-normal">({star.DacTinh})</span>}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 w-full gap-1 mt-1 border-t border-stone-50 pt-1">
                        <div className="flex flex-col items-start">{house.Saotot.map((star: any, idx: number) => <div key={`st-${idx}`} className="text-[10px] font-medium text-stone-600">{star.Name}</div>)}</div>
                        <div className="flex flex-col items-end">{house.Saoxau.map((star: any, idx: number) => <div key={`sx-${idx}`} className="text-[10px] font-medium text-stone-500 text-right">{star.Name}</div>)}</div>
                      </div>
                    </div>
                    {(house.Tuan === 1 || house.Triet === 1) && (
                      <div className="absolute bottom-1 right-1 flex flex-col gap-0.5">
                        {house.Tuan === 1 && <div className="text-[9px] font-bold text-white bg-slate-700 px-1 py-[1px] rounded-sm">Tuần</div>}
                        {house.Triet === 1 && <div className="text-[9px] font-bold text-white bg-slate-900 px-1 py-[1px] rounded-sm">Triệt</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI LUẬN GIẢI */}
            <div className="mt-8 max-w-5xl mx-auto bg-gradient-to-br from-purple-50 to-white p-6 sm:p-8 rounded-2xl border border-purple-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-fuchsia-100 rounded-lg text-fuchsia-600"><Sparkles className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-purple-900">AI Luận Giải Lá Số</h3>
              </div>
              <div className="text-stone-700 leading-relaxed min-h-[150px]">
                {isReading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-fuchsia-600 py-10">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-medium animate-pulse">Tinh tú đang hội tụ. AI đang phân tích cung mệnh...</p>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-medium">{aiReading}</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

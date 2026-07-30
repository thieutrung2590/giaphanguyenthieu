"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Solar, Lunar } from "lunar-javascript";
import { useState, useMemo } from "react";

// --- BỘ TỪ ĐIỂN DỊCH THUẬT CAN CHI & MỆNH ---
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

const ZODIAC_HOURS: Record<string, string[]> = {
  'Tý': ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'], 'Ngọ': ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
  'Sửu': ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'], 'Mùi': ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
  'Dần': ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'], 'Thân': ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
  'Mão': ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'], 'Dậu': ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'],
  'Thìn': ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'], 'Tuất': ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
  'Tỵ': ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'], 'Hợi': ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi']
};

const HOUR_STRINGS: Record<string, string> = {
  'Tý': 'Tý (23h-1h)', 'Sửu': 'Sửu (1h-3h)', 'Dần': 'Dần (3h-5h)', 'Mão': 'Mão (5h-7h)',
  'Thìn': 'Thìn (7h-9h)', 'Tỵ': 'Tỵ (9h-11h)', 'Ngọ': 'Ngọ (11h-13h)', 'Mùi': 'Mùi (13h-15h)',
  'Thân': 'Thân (15h-17h)', 'Dậu': 'Dậu (17h-19h)', 'Tuất': 'Tuất (19h-21h)', 'Hợi': 'Hợi (21h-23h)'
};

// Hàm tiện ích dịch chữ Hán sang tiếng Việt
function translateToVN(str: string) {
  if (!str) return "";
  let res = str;
  Object.entries(CAN_MAP).forEach(([k, v]) => res = res.replace(new RegExp(k, 'g'), v));
  Object.entries(CHI_MAP).forEach(([k, v]) => res = res.replace(new RegExp(k, 'g'), v));
  return res;
}

// Các sự kiện Dương lịch cố định
const SOLAR_EVENTS: Record<string, string> = {
  "01-01": "Tết Dương lịch", "02-14": "Lễ tình nhân", "03-08": "Quốc tế Phụ nữ",
  "04-30": "Giải phóng MN", "05-01": "Quốc tế LĐ", "06-01": "Quốc tế Thiếu nhi",
  "07-11": "Ngày dân số thế giới", "07-27": "Ngày TB Liệt Sĩ",
  "09-02": "Quốc khánh", "10-20": "Phụ nữ VN", "11-20": "Nhà giáo VN", "12-22": "QĐND Việt Nam"
};

const WEEKDAYS = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];

export default function LunisolarCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Trạng thái tháng/năm đang xem trên lưới (Grid)
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth() + 1);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  // --- HÀM XỬ LÝ SỰ KIỆN NÚT BẤM ---
  const handlePrevDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    setSelectedDate(next);
    setViewMonth(next.getMonth() + 1);
    setViewYear(next.getFullYear());
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    setViewMonth(next.getMonth() + 1);
    setViewYear(next.getFullYear());
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setViewMonth(today.getMonth() + 1);
    setViewYear(today.getFullYear());
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); } 
    else { setViewMonth(viewMonth - 1); }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); } 
    else { setViewMonth(viewMonth + 1); }
  };

  const handleJumpToGridMonth = () => {
    // Nút XEM không cần làm gì nhiều vì state đã bind thẳng vào select
  };

  // --- TÍNH TOÁN DỮ LIỆU NGÀY ĐANG CHỌN ĐỂ HIỂN THỊ PHẦN TRÊN ---
  const topInfo = useMemo(() => {
    const sYear = selectedDate.getFullYear();
    const sMonth = selectedDate.getMonth() + 1;
    const sDay = selectedDate.getDate();
    
    const solar = Solar.fromYmd(sYear, sMonth, sDay);
    const lunar = solar.getLunar();

    const lYearStr = translateToVN(lunar.getYearInGanZhi());
    const lMonthStr = translateToVN(lunar.getMonthInGanZhi());
    const lDayStr = translateToVN(lunar.getDayInGanZhi());
    
    // Mệnh ngày & Tuổi xung
    const naYin = NAYIN_MAP[lunar.getDayNaYin()] || lunar.getDayNaYin();
    const xungStr = translateToVN(lunar.getDayChongDesc());
    const satStr = translateToVN(lunar.getDaySha());

    // Tính Giờ Hoàng Đạo
    const chiNgay = translateToVN(lunar.getDayZhi());
    const hoangDaoHours = ZODIAC_HOURS[chiNgay] || [];
    const hoangDaoText = hoangDaoHours.map(chi => HOUR_STRINGS[chi]).join(", ");

    return {
      sDay, sMonth, sYear,
      lDay: lunar.getDay(),
      lMonth: Math.abs(lunar.getMonth()),
      isLeap: lunar.getMonth() < 0,
      lYearStr, lMonthStr, lDayStr,
      naYin,
      xungText: `${xungStr} (${satStr})`,
      hoangDaoText
    };
  }, [selectedDate]);


  // --- TÍNH TOÁN LƯỚI 42 Ô (GRID) ---
  const gridDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon
    
    // Chuyển Chủ nhật(0) thành vị trí cuối cùng (6), Thứ hai(1) thành 0
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - offset);

    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      
      const sYear = d.getFullYear();
      const sMonth = d.getMonth() + 1;
      const sDay = d.getDate();
      
      const solar = Solar.fromYmd(sYear, sMonth, sDay);
      const lunar = solar.getLunar();
      
      const lDay = lunar.getDay();
      const lMonth = Math.abs(lunar.getMonth());
      const lDayCanChi = translateToVN(lunar.getDayInGanZhi());

      // Hiển thị Lịch Âm: Nếu là mùng 1 Lịch Âm hoặc mùng 1 Lịch Dương thì thêm /Tháng
      let lunarDisplay = `${lDay}`;
      if (lDay === 1 || sDay === 1) {
        lunarDisplay = `${lDay}/${lMonth}`;
      }

      // Xét sự kiện
      let eventText = lDayCanChi; // Mặc định là Can Chi
      let isEvent = false;

      const solarKey = `${sMonth.toString().padStart(2, '0')}-${sDay.toString().padStart(2, '0')}`;
      if (lDay === 1) {
        eventText = "Ngày mồng 1";
        isEvent = true;
      } else if (lDay === 15) {
        eventText = "Ngày rằm";
        isEvent = true;
      } else if (SOLAR_EVENTS[solarKey]) {
        eventText = SOLAR_EVENTS[solarKey];
        isEvent = true;
      }

      days.push({
        dateObj: d,
        sDay,
        sMonth,
        isCurrentMonth: sMonth === viewMonth,
        isToday: d.toDateString() === today.toDateString(),
        isSelected: d.toDateString() === selectedDate.toDateString(),
        isWeekend: i % 7 === 5 || i % 7 === 6,
        isSunday: i % 7 === 6,
        lunarDisplay,
        eventText,
        isEvent,
        lDay
      });
    }
    return days;
  }, [viewMonth, viewYear, selectedDate]);

  return (
    <div className="max-w-4xl mx-auto font-sans bg-[#f8f9fa] shadow-lg rounded-md overflow-hidden border border-gray-200">
      
      {/* =========================================================
                             THẺ XEM CHI TIẾT
         ========================================================= */}
      <div className="bg-white">
        {/* Header Top Card */}
        <div className="bg-[#439c49] text-white px-4 py-2.5 flex justify-between items-center rounded-t-md">
          <h2 className="text-xl font-bold uppercase tracking-wide">Lịch Vạn Niên</h2>
          <button onClick={handleToday} className="flex items-center gap-1.5 bg-[#36803b] hover:bg-[#2b6830] px-3 py-1.5 rounded text-sm transition-colors border border-[#52af58]">
            <CalendarDays className="size-4" />
            <span>Xem nhanh theo ngày</span>
          </button>
        </div>

        {/* Cột hiển thị số lớn */}
        <div className="flex flex-col md:flex-row border-b border-gray-200 relative">
          
          {/* Nút Prev Day (bên trái) */}
          <button onClick={handlePrevDay} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full border border-gray-300 items-center justify-center text-gray-500 hover:border-[#439c49] hover:text-[#439c49] bg-white z-10 transition-colors">
            <ChevronLeft className="size-6" />
          </button>

          {/* Dương Lịch */}
          <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-1">Dương Lịch</h3>
            <div className="text-[100px] leading-[1.1] font-bold text-[#70b741] tracking-tighter">
              {topInfo.sDay.toString().padStart(2, '0')}
            </div>
            <p className="text-gray-600 text-base mt-2">
              Tháng {topInfo.sMonth.toString().padStart(2, '0')} năm {topInfo.sYear}
            </p>
          </div>

          {/* Âm Lịch */}
          <div className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-1">Âm lịch</h3>
            <div className="text-[100px] leading-[1.1] font-bold text-[#2b7d34] tracking-tighter">
              {topInfo.lDay}
            </div>
            <p className="text-gray-600 text-base mt-2">
              Tháng {topInfo.lMonth} năm {topInfo.lYearStr}
            </p>
            <p className="text-red-600 text-sm mt-1 font-medium">
              Ngày {topInfo.lDayStr} - Tháng {topInfo.lMonthStr}
            </p>
          </div>

          {/* Nút Next Day (bên phải) */}
          <button onClick={handleNextDay} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full border border-gray-300 items-center justify-center text-gray-500 hover:border-[#439c49] hover:text-[#439c49] bg-white z-10 transition-colors">
            <ChevronRight className="size-6" />
          </button>

        </div>

        {/* Thông tin Chi Tiết Dưới */}
        <div className="p-5 md:px-8 text-[15px] text-gray-800 leading-relaxed bg-[#fbfbfb]">
          <p className="mb-1">
            <span className="font-bold">Mệnh ngày:</span> {topInfo.naYin} - Ngày hoàng đạo
          </p>
          <p className="mb-1">
            <span className="font-bold">Giờ hoàng đạo:</span> {topInfo.hoangDaoText}
          </p>
          <p>
            <span className="font-bold">Tuổi xung:</span> {topInfo.xungText}
          </p>
        </div>
      </div>

      <div className="h-4 bg-gray-100 border-t border-gray-200"></div>

      {/* =========================================================
                             LƯỚI LỊCH (GRID)
         ========================================================= */}
      <div className="bg-white">
        {/* Header Grid */}
        <div className="bg-[#439c49] text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="size-8 rounded-full bg-white text-[#439c49] flex items-center justify-center hover:bg-gray-100 shadow-sm transition">
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-wider">THÁNG {viewMonth.toString().padStart(2, '0')} - {viewYear}</h2>
            <button onClick={handleNextMonth} className="size-8 rounded-full bg-white text-[#439c49] flex items-center justify-center hover:bg-gray-100 shadow-sm transition">
              <ChevronRight className="size-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-gray-700 text-sm">
            <select 
              value={viewMonth} 
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded bg-white border-none outline-none font-medium cursor-pointer"
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={`m-${i+1}`} value={i+1}>Tháng {i+1}</option>
              ))}
            </select>
            <select 
              value={viewYear} 
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded bg-white border-none outline-none font-medium cursor-pointer w-24"
            >
              {Array.from({length: 101}).map((_, i) => {
                const y = new Date().getFullYear() - 50 + i;
                return <option key={`y-${y}`} value={y}>{y}</option>
              })}
            </select>
            <button onClick={handleJumpToGridMonth} className="bg-[#1f6b24] text-white font-bold px-4 py-1.5 rounded hover:bg-[#154f19] transition border border-[#3b8740]">
              XEM
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((day, idx) => (
            <div key={day} className={`text-center py-3 text-[15px] font-medium ${idx === 6 ? 'text-gray-700' : 'text-gray-500'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 border-l border-gray-200">
          {gridDays.map((day, i) => {
            const isOpacity = !day.isCurrentMonth;
            
            return (
              <div 
                key={`grid-day-${i}`}
                onClick={() => setSelectedDate(day.dateObj)}
                className={`relative h-[110px] p-2 border-r border-b border-gray-200 cursor-pointer transition-colors
                  ${day.isSelected ? 'bg-[#fff3cd]' : 'bg-white hover:bg-gray-50'}
                  ${isOpacity ? 'opacity-40' : 'opacity-100'}
                `}
              >
                {/* Ngày Dương */}
                <div className={`text-[28px] font-bold leading-none ${day.isSunday ? 'text-[#e53e3e]' : 'text-black'}`}>
                  {day.sDay.toString().padStart(2, '0')}
                  {/* Chấm nhỏ trang trí (Giả lập giống ảnh) */}
                  {(day.sDay % 2 !== 0 && !day.isWeekend) && (
                    <span className="absolute top-2.5 left-[34px] size-1.5 rounded-full bg-[#439c49]"></span>
                  )}
                </div>

                {/* Ngày Âm */}
                <div className={`absolute top-2 right-2 text-[13px] font-medium ${
                  (day.lDay === 1 || day.lDay === 15 || day.isEvent) && day.isCurrentMonth ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {day.lunarDisplay}
                </div>

                {/* Chữ mô tả (Can chi hoặc Sự kiện) */}
                <div className={`absolute bottom-2 left-0 w-full text-center text-[11px] px-1 line-clamp-2 leading-tight ${
                  day.isEvent && day.isCurrentMonth ? 'text-red-600 font-medium' : 'text-gray-400'
                }`}>
                  {day.eventText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

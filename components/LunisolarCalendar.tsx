"use client";

import { ChevronLeft, ChevronRight, CalendarDays, X, Sun, Moon } from "lucide-react";
import { Solar, Lunar } from "lunar-javascript";
import { useState, useMemo, useCallback } from "react";

// --- BỘ TỪ ĐIỂN DỊCH THUẬT CAN CHI & MỆNH ---
const HAN_VIET_MAP: Record<string, string> = {
  '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu', '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý',
  '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ', '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi'
};

const HAN_VIET_REGEX = new RegExp(Object.keys(HAN_VIET_MAP).join('|'), 'g');

function translateToVN(str: string) {
  if (!str) return "";
  return str.replace(HAN_VIET_REGEX, match => HAN_VIET_MAP[match] || match);
}

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

const SOLAR_EVENTS: Record<string, string> = {
  "01-01": "Tết Dương lịch", "02-14": "Lễ tình nhân", "03-08": "Quốc tế Phụ nữ",
  "04-30": "Giải phóng MN", "05-01": "Quốc tế LĐ", "06-01": "Quốc tế Thiếu nhi",
  "07-11": "Ngày dân số thế giới", "07-27": "Ngày TB Liệt Sĩ",
  "09-02": "Quốc khánh", "10-20": "Phụ nữ VN", "11-20": "Nhà giáo VN", "12-22": "QĐND Việt Nam"
};

const WEEKDAYS = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];
const MINI_WEEKDAYS = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_LIST = Array.from({ length: 101 }, (_, i) => CURRENT_YEAR - 50 + i);
const MONTHS_LIST = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS_31_LIST = Array.from({ length: 31 }, (_, i) => i + 1);

// --- CACHE KẾT QUẢ TÍNH TOÁN ---
const LUNAR_CACHE = new Map<string, Lunar>();
function getCachedLunar(y: number, m: number, d: number): Lunar {
  const key = `${y}-${m}-${d}`;
  if (LUNAR_CACHE.has(key)) return LUNAR_CACHE.get(key)!;
  if (LUNAR_CACHE.size > 500) LUNAR_CACHE.clear();
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  LUNAR_CACHE.set(key, lunar);
  return lunar;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

// --- TÌM THÁNG NHUẬN (Bypass lỗi TS của LunarYear) ---
// Dùng Solar quét qua các ngày trong năm (bước nhảy 15 ngày) để tự dò tháng âm bị âm (nhuận)
function getLeapMonthOfYear(y: number): number {
  const date = new Date(y, 0, 15); // Bắt đầu quét từ 15/1 dương lịch
  const endDate = new Date(y + 1, 2, 15); // Quét tới 15/3 năm sau (chắc chắn cover hết năm âm lịch)
  
  while (date <= endDate) {
    const lunar = getCachedLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    if (lunar.getYear() === y && lunar.getMonth() < 0) {
      return Math.abs(lunar.getMonth());
    }
    date.setDate(date.getDate() + 15); // Bước nhảy 15 ngày không thể sót được bất kỳ tháng nào
  }
  return 0; // Năm không có tháng nhuận
}

export default function LunisolarCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth() + 1);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  const [showQuickView, setShowQuickView] = useState(false);
  const [modalDate, setModalDate] = useState(new Date());
  const [modalViewMonth, setModalViewMonth] = useState(modalDate.getMonth() + 1);
  const [modalViewYear, setModalViewYear] = useState(modalDate.getFullYear());

  const changeMainMonth = useCallback((offsetMonth: number) => {
    const newDate = new Date(viewYear, viewMonth - 1 + offsetMonth, 1);
    setSelectedDate(newDate);
    setViewMonth(newDate.getMonth() + 1);
    setViewYear(newDate.getFullYear());
  }, [viewMonth, viewYear]);

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

  const handlePrevMonth = () => changeMainMonth(-1);
  const handleNextMonth = () => changeMainMonth(1);

  const openQuickView = () => {
    setModalDate(selectedDate);
    setModalViewMonth(selectedDate.getMonth() + 1);
    setModalViewYear(selectedDate.getFullYear());
    setShowQuickView(true);
  };

  const closeQuickView = () => setShowQuickView(false);

  const handleApplyQuickView = () => {
    setSelectedDate(modalDate);
    setViewMonth(modalDate.getMonth() + 1);
    setViewYear(modalDate.getFullYear());
    setShowQuickView(false);
  };

  const changeModalMonth = (offsetMonth: number) => {
    const newDate = new Date(modalViewYear, modalViewMonth - 1 + offsetMonth, 1);
    setModalViewMonth(newDate.getMonth() + 1);
    setModalViewYear(newDate.getFullYear());
  };

  const handleModalPrevMonth = () => changeModalMonth(-1);
  const handleModalNextMonth = () => changeModalMonth(1);

  const modalSolarData = useMemo(() => {
    return { d: modalDate.getDate(), m: modalDate.getMonth() + 1, y: modalDate.getFullYear() };
  }, [modalDate]);

  const modalLunarData = useMemo(() => {
    const lunar = getCachedLunar(modalSolarData.y, modalSolarData.m, modalSolarData.d);
    return { 
      d: lunar.getDay(), 
      m: lunar.getMonth(), // Trả về số âm nếu đó là tháng nhuận
      y: lunar.getYear(),
      isLeap: lunar.getMonth() < 0
    };
  }, [modalSolarData]);

  // Tạo động Dropdown Tháng Âm lịch (hỗ trợ Nhuận)
  const lunarMonthOptions = useMemo(() => {
    const options = [];
    const leapMonth = getLeapMonthOfYear(modalLunarData.y);
    
    for(let i = 1; i <= 12; i++) {
      options.push({ value: i, label: `Tháng ${i}` });
      if (i === leapMonth) {
        options.push({ value: -i, label: `Tháng ${i} (Nhuận)` }); // Giá trị âm cho tháng nhuận
      }
    }
    return options;
  }, [modalLunarData.y]);

  const handleModalSolarChange = (type: 'd' | 'm' | 'y', value: number) => {
    let { d, m, y } = modalSolarData;
    if (type === 'y') y = value;
    if (type === 'm') m = value;
    if (type === 'd') d = value;
    
    const maxDays = getDaysInMonth(y, m);
    if (d > maxDays) d = maxDays;
    
    const newDate = new Date(y, m - 1, d);
    setModalDate(newDate);
    setModalViewMonth(m);
    setModalViewYear(y);
  };

  const handleModalLunarChange = (type: 'd' | 'm' | 'y', value: number) => {
    let { d, m, y } = modalLunarData;
    
    if (type === 'y') {
      y = value;
      // Tránh lỗi khi đang chọn tháng Nhuận, mà đổi qua năm không có tháng Nhuận đó
      const leapMonth = getLeapMonthOfYear(y);
      if (m < 0 && Math.abs(m) !== leapMonth) {
        m = Math.abs(m);
      }
    }
    if (type === 'm') m = value;
    if (type === 'd') d = value;

    try {
      const tempLunar = Lunar.fromYmd(y, m, 1) as Lunar & { getDayCount: () => number };
      const maxLunarDays = tempLunar.getDayCount();

      if (d > maxLunarDays) d = maxLunarDays;

      const lunarObj = Lunar.fromYmd(y, m, d) as Lunar & { getSolar: () => Solar };
      const solarObj = lunarObj.getSolar();
      const newDate = new Date(solarObj.getYear(), solarObj.getMonth() - 1, solarObj.getDay());
      
      setModalDate(newDate);
      setModalViewMonth(newDate.getMonth() + 1);
      setModalViewYear(newDate.getFullYear());
    } catch (e) {
      console.error("Lỗi khi chuyển đổi ngày âm:", e);
    }
  };

  const miniGridDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(modalViewYear, modalViewMonth - 1, 1);
    const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - offset);

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const sYear = d.getFullYear();
      const sMonth = d.getMonth() + 1;
      const sDay = d.getDate();
      
      const lunar = getCachedLunar(sYear, sMonth, sDay);
      const lMonthAbs = Math.abs(lunar.getMonth());
      const isLeap = lunar.getMonth() < 0;
      
      let lunarDisplay = `${lunar.getDay()}`;
      if (lunar.getDay() === 1 || sDay === 1) {
        lunarDisplay = `${lunar.getDay()}/${lMonthAbs}${isLeap ? '(N)' : ''}`;
      }

      days.push({
        dateObj: d,
        sDay, sMonth,
        isCurrentMonth: sMonth === modalViewMonth,
        isSelected: d.toDateString() === modalDate.toDateString(),
        isSunday: i % 7 === 6,
        lunarDisplay
      });
    }
    return days;
  }, [modalViewMonth, modalViewYear, modalDate]);


  const topInfo = useMemo(() => {
    const sYear = selectedDate.getFullYear();
    const sMonth = selectedDate.getMonth() + 1;
    const sDay = selectedDate.getDate();
    
    const lunar = getCachedLunar(sYear, sMonth, sDay) as Lunar & {
      getYearInGanZhi: () => string;
      getMonthInGanZhi: () => string;
      getDayInGanZhi: () => string;
      getDayNaYin: () => string;
      getDayChongDesc: () => string;
      getDaySha: () => string;
      getDayTianShenType: () => string;
      getDayZhi: () => string;
    };

    const lYearStr = translateToVN(lunar.getYearInGanZhi());
    const lMonthStr = translateToVN(lunar.getMonthInGanZhi());
    const lDayStr = translateToVN(lunar.getDayInGanZhi());
    
    const naYin = NAYIN_MAP[lunar.getDayNaYin()] || lunar.getDayNaYin();
    const xungStr = translateToVN(lunar.getDayChongDesc());
    const satStr = translateToVN(lunar.getDaySha());

    const dayTianShenType = typeof lunar.getDayTianShenType === 'function' ? lunar.getDayTianShenType() : '';
    const dayType = dayTianShenType === '黄道' ? 'Hoàng đạo' : (dayTianShenType === '黑道' ? 'Hắc đạo' : '');

    const chiNgay = translateToVN(lunar.getDayZhi());
    const hoangDaoHours = ZODIAC_HOURS[chiNgay] || [];
    const hoangDaoText = hoangDaoHours.map((chi: string) => HOUR_STRINGS[chi]).join(", ");

    return {
      sDay, sMonth, sYear,
      lDay: lunar.getDay(),
      lMonth: Math.abs(lunar.getMonth()),
      isLeap: lunar.getMonth() < 0,
      lYearStr, lMonthStr, lDayStr,
      naYin,
      xungText: `${xungStr} (${satStr})`,
      hoangDaoText,
      dayType
    };
  }, [selectedDate]);


  const gridDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - offset);

    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      
      const sYear = d.getFullYear();
      const sMonth = d.getMonth() + 1;
      const sDay = d.getDate();
      
      const lunar = getCachedLunar(sYear, sMonth, sDay) as Lunar & {
        getDayInGanZhi: () => string;
        getDayTianShenType: () => string;
      };
      
      const lDay = lunar.getDay();
      const lMonth = Math.abs(lunar.getMonth());
      const isLeap = lunar.getMonth() < 0;
      const lDayCanChi = translateToVN(lunar.getDayInGanZhi());

      const dayTianShenType = typeof lunar.getDayTianShenType === 'function' ? lunar.getDayTianShenType() : '';
      const isHoangDao = dayTianShenType === '黄道';
      const isHacDao = dayTianShenType === '黑道';

      let lunarDisplay = `${lDay}`;
      if (lDay === 1 || sDay === 1) {
        lunarDisplay = `${lDay}/${lMonth}${isLeap ? '(N)' : ''}`;
      }

      let eventText = lDayCanChi; 
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
        lDay,
        isHoangDao,
        isHacDao
      });
    }
    return days;
  }, [viewMonth, viewYear, selectedDate]);


  return (
    <div className="max-w-4xl mx-auto font-sans bg-[#f8f9fa] shadow-lg rounded-md overflow-hidden border border-gray-200">
      
      {showQuickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-[360px] rounded-xl shadow-2xl p-4 sm:p-5 flex flex-col">
            
            <button 
              onClick={closeQuickView} 
              className="absolute -top-3 -right-3 size-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors cursor-pointer border border-white/20 shadow-md"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 tracking-wide uppercase">
                Tháng {modalViewMonth.toString().padStart(2, '0')} - {modalViewYear}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={handleModalPrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={handleModalNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-7 mb-2">
                {MINI_WEEKDAYS.map((w, i) => (
                  <div key={w} className={`text-center text-xs font-medium ${i === 6 ? 'text-red-500' : 'text-gray-500'}`}>
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {miniGridDays.map((d, i) => (
                  <div 
                    key={`mini-${i}`} 
                    onClick={() => {
                      setModalDate(d.dateObj);
                      setModalViewMonth(d.sMonth);
                      setModalViewYear(d.dateObj.getFullYear());
                    }}
                    className={`h-11 w-full flex flex-col items-center justify-center rounded cursor-pointer transition-all ${
                      d.isSelected 
                        ? 'bg-[#959595] text-white shadow-inner' 
                        : d.isCurrentMonth 
                          ? 'hover:bg-gray-100' 
                          : 'opacity-40 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-[15px] font-bold leading-tight ${d.isSunday && !d.isSelected ? 'text-red-600' : ''}`}>
                      {d.sDay.toString().padStart(2, '0')}
                    </span>
                    <span className={`text-[10px] leading-none mt-0.5 ${d.isSelected ? 'text-gray-100' : 'text-gray-400'}`}>
                      {d.lunarDisplay}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1.5 mb-2 text-amber-500 font-semibold text-[15px]">
                <Sun className="size-5 fill-amber-500" />
                <span className="text-gray-800">Dương Lịch</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={modalSolarData.d} onChange={(e) => handleModalSolarChange('d', Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 outline-none text-sm text-gray-700 bg-white">
                  {DAYS_31_LIST.map(d => <option key={`sd-${d}`} value={d}>Ngày {d}</option>)}
                </select>
                <select value={modalSolarData.m} onChange={(e) => handleModalSolarChange('m', Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 outline-none text-sm text-gray-700 bg-white">
                  {MONTHS_LIST.map(m => <option key={`sm-${m}`} value={m}>Tháng {m}</option>)}
                </select>
                <select value={modalSolarData.y} onChange={(e) => handleModalSolarChange('y', Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 outline-none text-sm text-gray-700 bg-white">
                  {YEARS_LIST.map(y => <option key={`sy-${y}`} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2 text-gray-400 font-semibold text-[15px]">
                <Moon className="size-5 fill-gray-300" />
                <span className="text-gray-800">Âm Lịch</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={modalLunarData.d} onChange={(e) => handleModalLunarChange('d', Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 outline-none text-sm text-gray-700 bg-white">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(d => <option key={`ld-${d}`} value={d}>Ngày {d}</option>)}
                </select>
                <select value={modalLunarData.m} onChange={(e) => handleModalLunarChange('m', Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 outline-none text-sm text-gray-700 bg-white">
                  {lunarMonthOptions.map(opt => <option key={`lm-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                </select>
                <select value={modalLunarData.y} onChange={(e) => handleModalLunarChange('y', Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 outline-none text-sm text-gray-700 bg-white">
                  {YEARS_LIST.map(y => <option key={`ly-${y}`} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleApplyQuickView}
              className="mt-6 w-full bg-[#7bb643] hover:bg-[#689d36] text-white font-bold py-2.5 rounded text-[15px] transition-colors shadow-sm"
            >
              XEM
            </button>
          </div>
        </div>
      )}

      <div className="bg-white">
        <div className="bg-[#439c49] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex justify-between items-center rounded-t-md">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide">Lịch Vạn Niên</h2>
          <button onClick={openQuickView} className="flex items-center gap-1.5 bg-[#36803b] hover:bg-[#2b6830] px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm transition-colors border border-[#52af58]">
            <CalendarDays className="size-4" />
            <span className="hidden sm:inline">Xem nhanh theo ngày</span>
            <span className="sm:hidden">Xem nhanh</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row border-b border-gray-200 relative">
          <button onClick={handlePrevDay} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full border border-gray-300 items-center justify-center text-gray-500 hover:border-[#439c49] hover:text-[#439c49] bg-white z-10 transition-colors">
            <ChevronLeft className="size-6" />
          </button>

          <div className="flex-1 p-4 sm:p-6 md:p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">Dương Lịch</h3>
            <div className="text-[60px] sm:text-[80px] md:text-[100px] leading-[1.1] font-bold text-[#70b741] tracking-tighter">
              {topInfo.sDay.toString().padStart(2, '0')}
            </div>
            <p className="text-gray-600 text-sm sm:text-base mt-1 sm:mt-2">
              Tháng {topInfo.sMonth.toString().padStart(2, '0')} năm {topInfo.sYear}
            </p>
          </div>

          <div className="flex-1 p-4 sm:p-6 md:p-10 flex flex-col items-center justify-center">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">Âm lịch</h3>
            <div className="text-[60px] sm:text-[80px] md:text-[100px] leading-[1.1] font-bold text-[#2b7d34] tracking-tighter">
              {topInfo.lDay}
            </div>
            <p className="text-gray-600 text-sm sm:text-base mt-1 sm:mt-2">
              Tháng {topInfo.lMonth} {topInfo.isLeap && "(Nhuận)"} năm {topInfo.lYearStr}
            </p>
            <p className="text-red-600 text-xs sm:text-sm mt-1 font-medium text-center">
              Ngày {topInfo.lDayStr} - Tháng {topInfo.lMonthStr}
            </p>
          </div>

          <button onClick={handleNextDay} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full border border-gray-300 items-center justify-center text-gray-500 hover:border-[#439c49] hover:text-[#439c49] bg-white z-10 transition-colors">
            <ChevronRight className="size-6" />
          </button>
        </div>

        <div className="p-4 sm:p-5 md:px-8 text-sm sm:text-[15px] text-gray-800 leading-relaxed bg-[#fbfbfb]">
          <p className="mb-1">
            <span className="font-bold">Mệnh ngày:</span> {topInfo.naYin} {topInfo.dayType ? `- Ngày ${topInfo.dayType}` : ''}
          </p>
          <p className="mb-1">
            <span className="font-bold">Giờ hoàng đạo:</span> {topInfo.hoangDaoText}
          </p>
          <p>
            <span className="font-bold">Tuổi xung:</span> {topInfo.xungText}
          </p>
        </div>
      </div>

      <div className="h-2 sm:h-4 bg-gray-100 border-t border-gray-200"></div>

      <div className="bg-white">
        <div className="bg-[#439c49] text-white px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={handlePrevMonth} className="size-7 sm:size-8 rounded-full bg-white text-[#439c49] flex items-center justify-center hover:bg-gray-100 shadow-sm transition">
              <ChevronLeft className="size-4 sm:size-5" />
            </button>
            <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider">THÁNG {viewMonth.toString().padStart(2, '0')} - {viewYear}</h2>
            <button onClick={handleNextMonth} className="size-7 sm:size-8 rounded-full bg-white text-[#439c49] flex items-center justify-center hover:bg-gray-100 shadow-sm transition">
              <ChevronRight className="size-4 sm:size-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-gray-700 text-xs sm:text-sm">
            <select 
              value={viewMonth} 
              onChange={(e) => {
                setViewMonth(Number(e.target.value));
                setSelectedDate(new Date(viewYear, Number(e.target.value) - 1, 1));
              }}
              className="px-2 py-1 sm:px-3 sm:py-1.5 rounded bg-white border-none outline-none font-medium cursor-pointer"
            >
              {MONTHS_LIST.map(m => (
                <option key={`m-${m}`} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select 
              value={viewYear} 
              onChange={(e) => {
                setViewYear(Number(e.target.value));
                setSelectedDate(new Date(Number(e.target.value), viewMonth - 1, 1));
              }}
              className="px-2 py-1 sm:px-3 sm:py-1.5 rounded bg-white border-none outline-none font-medium cursor-pointer w-20 sm:w-24"
            >
              {YEARS_LIST.map(y => (
                <option key={`y-${y}`} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((day, idx) => (
            <div key={day} className={`text-center py-2 sm:py-3 text-[12px] sm:text-[15px] font-medium ${idx === 6 ? 'text-gray-700' : 'text-gray-500'}`}>
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{MINI_WEEKDAYS[idx]}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-gray-200">
          {gridDays.map((day, i) => {
            const isOpacity = !day.isCurrentMonth;
            
            return (
              <div 
                key={`grid-day-${i}`}
                onClick={() => setSelectedDate(day.dateObj)}
                className={`relative h-[85px] sm:h-[110px] p-1 sm:p-2 border-r border-b border-gray-200 cursor-pointer transition-colors
                  ${day.isSelected ? 'bg-[#fff3cd]' : 'bg-white hover:bg-gray-50'}
                  ${isOpacity ? 'opacity-40' : 'opacity-100'}
                `}
              >
                <div className={`text-[18px] sm:text-[28px] font-bold leading-none w-fit relative ${day.isSunday ? 'text-[#e53e3e]' : 'text-black'}`}>
                  {day.sDay.toString().padStart(2, '0')}
                  
                  {day.isHoangDao && (
                    <span className="absolute top-0 sm:top-1 -right-2 sm:-right-3 size-1 sm:size-1.5 rounded-full bg-[#439c49]" title="Ngày Hoàng Đạo"></span>
                  )}
                  {day.isHacDao && (
                    <span className="absolute top-0 sm:top-1 -right-2 sm:-right-3 size-1 sm:size-1.5 rounded-full bg-gray-800" title="Ngày Hắc Đạo"></span>
                  )}
                </div>

                <div className={`absolute top-1 sm:top-2 right-1 sm:right-2 text-[10px] sm:text-[13px] font-medium ${
                  (day.lDay === 1 || day.lDay === 15 || day.isEvent) && day.isCurrentMonth ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {day.lunarDisplay}
                </div>

                <div className={`absolute bottom-1 sm:bottom-2 left-0 w-full text-center text-[9px] sm:text-[11px] px-0.5 sm:px-1 line-clamp-2 leading-tight ${
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

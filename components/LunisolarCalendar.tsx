"use client";

import { motion } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Solar } from "lunar-javascript";
import { useState } from "react";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function LunisolarCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Chuyển đổi tháng
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Tính toán lưới lịch (Grid)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days = [];
  
  // Các ô trống của tháng trước
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Các ngày trong tháng hiện tại
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  // Hôm nay (để highlight)
  const today = new Date();
  const isToday = (day: number) => 
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="bg-white rounded-3xl border border-stone-200/60 shadow-sm p-4 sm:p-8">
      {/* Header điều hướng */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <CalendarIcon className="size-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight capitalize">
              Tháng {month + 1}, {year}
            </h2>
            <p className="text-sm text-stone-500 font-medium">Lịch Vạn Niên</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleToday}
            className="px-4 py-2 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Hôm nay
          </button>
          <div className="flex items-center bg-stone-50 border border-stone-200/60 rounded-xl p-1">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lưới lịch */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {WEEKDAYS.map((day, idx) => (
          <div 
            key={day} 
            className={`text-center font-bold text-[13px] sm:text-sm py-2 ${
              idx === 0 ? "text-rose-500" : "text-stone-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square rounded-xl bg-stone-50/50"></div>;
          }

          // Tính toán ngày âm lịch
          let lunarText = "";
          try {
            const solar = Solar.fromYmd(year, month + 1, day);
            const lunar = solar.getLunar();
            const lDay = lunar.getDay();
            const lMonth = Math.abs(lunar.getMonth());
            const isLeap = lunar.getMonth() < 0;
            
            // Nếu là mùng 1, hiển thị thêm tháng (VD: 1/7). Nếu không chỉ hiện ngày (VD: 15)
            lunarText = lDay === 1 
              ? `${lDay}/${lMonth}${isLeap ? " (Nhuận)" : ""}`
              : `${lDay}`;
          } catch (error) {
            console.error("Lỗi tính lịch âm:", error);
          }

          const todayCheck = isToday(day);
          const isSunday = index % 7 === 0;

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              key={`day-${day}`}
              className={`relative aspect-square rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all group ${
                todayCheck 
                  ? "bg-amber-500 border-amber-600 text-white shadow-sm" 
                  : "bg-white border-stone-200/60 hover:border-amber-300 text-stone-700"
              }`}
            >
              {/* Ngày Dương */}
              <span className={`text-lg sm:text-2xl font-bold ${
                todayCheck ? "text-white" : isSunday ? "text-rose-600" : ""
              }`}>
                {day}
              </span>
              
              {/* Ngày Âm */}
              <span className={`text-[10px] sm:text-xs font-medium absolute bottom-1 sm:bottom-2 right-1.5 sm:right-2 ${
                todayCheck ? "text-amber-100" : "text-stone-400 group-hover:text-amber-600"
              }`}>
                {lunarText}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

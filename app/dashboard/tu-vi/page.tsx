"use client";

import {
  Briefcase,
  CalendarDays,
  CalendarSearch,
  Clock,
  Heart,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decor - Các dải màu tím mờ ảo phía sau */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-300/30 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Card */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-purple-50/90 to-fuchsia-50/90 backdrop-blur-xl border border-white/60 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-purple-900/10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-950 mb-3 tracking-tight">
            Lập lá số Tử Vi
          </h1>
          <p className="text-purple-700/80 text-sm sm:text-base font-medium">
            Khám phá vận mệnh - Định hướng tương lai
          </p>
        </div>

        {/* Form Container */}
        <div className="space-y-4">
          
          {/* 1. Họ và tên */}
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

          {/* 2. Ngày / Tháng / Năm / Loại lịch */}
          <InputWrapper icon={CalendarDays}>
            <div className="flex items-center w-full text-stone-700 text-sm font-medium divide-x divide-purple-100">
              <select
                name="day"
                value={formData.day}
                onChange={handleChange}
                className="bg-transparent outline-none cursor-pointer w-full pr-2 appearance-none"
              >
                <option value="">Ngày</option>
                {Array.from({ length: 31 }).map((_, i) => (
                  <option key={i} value={i + 1}>Ngày {i + 1}</option>
                ))}
              </select>
              
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                className="bg-transparent outline-none cursor-pointer w-full px-2 appearance-none"
              >
                <option value="">Tháng</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i + 1}>Tháng {i + 1}</option>
                ))}
              </select>
              
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="bg-transparent outline-none cursor-pointer w-full px-2 appearance-none"
              >
                <option value="">Năm</option>
                {Array.from({ length: 100 }).map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
              
              <select
                name="calendar"
                value={formData.calendar}
                onChange={handleChange}
                className="bg-transparent outline-none cursor-pointer w-full pl-2 appearance-none text-purple-700 font-bold"
              >
                <option value="Dương lịch">Dương lịch</option>
                <option value="Âm lịch">Âm lịch</option>
              </select>
            </div>
          </InputWrapper>

          {/* 3. Giờ sinh */}
          <InputWrapper icon={Clock}>
            <select
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none"
            >
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

          {/* 4. Giới tính & Năm xem (2 Cột) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWrapper icon={Users}>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none"
              >
                <option value="">Giới tính</option>
                <option value="Nam giới">Nam giới</option>
                <option value="Nữ giới">Nữ giới</option>
              </select>
            </InputWrapper>

            <InputWrapper icon={CalendarSearch}>
              <select
                name="viewYear"
                value={formData.viewYear}
                onChange={handleChange}
                className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none"
              >
                <option value="">Năm xem</option>
                <option value="2026">Năm xem 2026</option>
                <option value="2027">Năm xem 2027</option>
              </select>
            </InputWrapper>
          </div>

          {/* 5. Tình trạng công việc & Mối quan hệ (2 Cột) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWrapper icon={Briefcase}>
              <select
                name="job"
                value={formData.job}
                onChange={handleChange}
                className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none"
              >
                <option value="" disabled hidden>Tình trạng công việc</option>
                <option value="Đang đi học">Đang đi học</option>
                <option value="Đang đi làm">Đang đi làm</option>
                <option value="Kinh doanh tự do">Kinh doanh tự do</option>
              </select>
            </InputWrapper>

            <InputWrapper icon={Heart}>
              <select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                className="w-full bg-transparent outline-none text-stone-700 font-semibold cursor-pointer appearance-none"
              >
                <option value="" disabled hidden>Tình trạng mối quan hệ</option>
                <option value="Độc thân">Độc thân</option>
                <option value="Đang hẹn hò">Đang hẹn hò</option>
                <option value="Đã kết hôn">Đã kết hôn</option>
              </select>
            </InputWrapper>
          </div>

          {/* Submit Button */}
          <button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98]">
            Xem luận giải
          </button>

          {/* Footer Text */}
          <p className="text-center text-sm text-stone-500 mt-6 font-medium">
            Bạn có thể xem lá số minh họa{" "}
            <Link href="#" className="text-fuchsia-600 font-bold hover:underline">
              Tại đây
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

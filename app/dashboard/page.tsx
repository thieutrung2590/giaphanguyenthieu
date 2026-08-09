import { getTodayLunar } from "@/utils/dateHelpers";
import { computeEvents } from "@/utils/eventHelpers";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  Cake,
  Calendar,
  CalendarDays,
  Database,
  Flower2,
  GitMerge,
  HeartHandshake,
  Image as ImageIcon,
  Network,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

/* ── ĐIỂM SỬA 3: KHAI BÁO TYPE RÕ RÀNG CHO EVENT ────────────────────────── */
type EventType = "birthday" | "death_anniversary" | "custom_event";

const eventTypeConfig: Record<EventType, { icon: any; label: string; color: string; bg: string }> = {
  birthday: {
    icon: Cake,
    label: "Sinh nhật",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  death_anniversary: {
    icon: Flower2,
    label: "Ngày giỗ",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  custom_event: {
    icon: Star,
    label: "Sự kiện",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
};

export default async function DashboardLaunchpad() {
  const isAdmin = await getIsAdmin();
  const supabase = await getSupabase();

  /* ── Fetch events data ────────────────────────────────────────── */
  const { data: persons } = await supabase
    .from("persons")
    .select(
      "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased",
    );

  const { data: customEvents } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by");

  const allEvents = computeEvents(persons ?? [], customEvents ?? []);
  const upcomingEvents = allEvents.filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= 30,
  );

  const lunar = getTodayLunar();

  /* ── ĐIỂM SỬA 1: VIẾT FULL CHUỖI CLASS ĐỂ TAILWIND KHÔNG XÓA (PURGE) ─── */
  const publicFeatures = [
    {
      title: "Cây gia phả",
      description: "Xem và tương tác với sơ đồ dòng họ",
      icon: <Network className="size-8 text-amber-600" />,
      href: "/dashboard/members",
      iconBg: "bg-amber-50",
      cardBorder: "border-amber-200/60",
      cardHover: "hover:border-amber-400 hover:shadow-amber-100",
      iconGroupHoverBorder: "group-hover:border-amber-200/60",
    },
    {
      title: "Lịch Âm Dương",
      description: "Tra cứu ngày tháng và quy đổi Âm - Dương",
      icon: <Calendar className="size-8 text-indigo-600" />,
      href: "/dashboard/calendar",
      iconBg: "bg-indigo-50",
      cardBorder: "border-indigo-200/60",
      cardHover: "hover:border-indigo-400 hover:shadow-indigo-100",
      iconGroupHoverBorder: "group-hover:border-indigo-200/60",
    },
    {
      title: "Xem tử vi",
      description: "Lập lá số và luận giải tử vi trọn đời",
      icon: <Sparkles className="size-8 text-fuchsia-600" />,
      href: "/dashboard/tu-vi",
      iconBg: "bg-fuchsia-50",
      cardBorder: "border-fuchsia-200/60",
      cardHover: "hover:border-fuchsia-400 hover:shadow-fuchsia-100",
      iconGroupHoverBorder: "group-hover:border-fuchsia-200/60",
    },
    {
      title: "Tra cứu danh xưng",
      description: "Hệ thống gọi tên họ hàng chuẩn xác",
      icon: <GitMerge className="size-8 text-blue-600" />,
      href: "/dashboard/kinship",
      iconBg: "bg-blue-50",
      cardBorder: "border-blue-200/60",
      cardHover: "hover:border-blue-400 hover:shadow-blue-100",
      iconGroupHoverBorder: "group-hover:border-blue-200/60",
    },
    {
      title: "Thống kê gia phả",
      description: "Tổng quan dữ liệu và biểu đồ phân tích",
      icon: <BarChart2 className="size-8 text-purple-600" />,
      href: "/dashboard/stats",
      iconBg: "bg-purple-50",
      cardBorder: "border-purple-200/60",
      cardHover: "hover:border-purple-400 hover:shadow-purple-100",
      iconGroupHoverBorder: "group-hover:border-purple-200/60",
    },
    {
      title: "Công đức dòng họ",
      description: "Ghi nhận đóng góp xây dựng quỹ",
      icon: <HeartHandshake className="size-8 text-rose-600" />,
      href: "/dashboard/donations",
      iconBg: "bg-rose-50",
      cardBorder: "border-rose-200/60",
      cardHover: "hover:border-rose-400 hover:shadow-rose-100",
      iconGroupHoverBorder: "group-hover:border-rose-200/60",
    },
    {
      title: "Ảnh kỷ niệm",
      description: "Lưu giữ và chia sẻ những khoảnh khắc đáng nhớ",
      icon: <ImageIcon className="size-8 text-green-600" />,
      href: "/dashboard/photos",
      iconBg: "bg-green-50",
      cardBorder: "border-green-200/60",
      cardHover: "hover:border-green-400 hover:shadow-green-100",
      iconGroupHoverBorder: "group-hover:border-green-200/60",
    },
    {
      title: "Lịch sử dòng họ",
      description: "Ghi chép lại những cột mốc và sự kiện quan trọng",
      icon: <BookOpen className="size-8 text-stone-600" />,
      href: "/history",
      iconBg: "bg-stone-100",
      cardBorder: "border-stone-200/60",
      cardHover: "hover:border-stone-400 hover:shadow-stone-100",
      iconGroupHoverBorder: "group-hover:border-stone-200/60",
    },
  ];

  const adminFeatures = [
    {
      title: "Quản lý Người dùng",
      description: "Phê duyệt tài khoản và phân quyền",
      icon: <Users className="size-8 text-rose-600" />,
      href: "/dashboard/users",
      iconBg: "bg-rose-50",
      cardBorder: "border-rose-200/60",
      cardHover: "hover:border-rose-400 hover:shadow-rose-100",
      iconGroupHoverBorder: "group-hover:border-rose-200/60",
    },
    {
      title: "Thứ tự gia phả",
      description: "Sắp xếp và xem cấu trúc hệ thống",
      icon: <Network className="size-8 text-indigo-600" />,
      href: "/dashboard/lineage",
      iconBg: "bg-indigo-50",
      cardBorder: "border-indigo-200/60",
      cardHover: "hover:border-indigo-400 hover:shadow-indigo-100",
      iconGroupHoverBorder: "group-hover:border-indigo-200/60",
    },
    {
      title: "Sao lưu & Phục hồi",
      description: "Xuất/Nhập dữ liệu toàn hệ thống",
      icon: <Database className="size-8 text-teal-600" />,
      href: "/dashboard/data",
      iconBg: "bg-teal-50",
      cardBorder: "border-teal-200/60",
      cardHover: "hover:border-teal-400 hover:shadow-teal-100",
      iconGroupHoverBorder: "group-hover:border-teal-200/60",
    },
  ];

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* ── Today's Date & Upcoming Events ─────────────────── */}
      <Link
        href="/dashboard/events"
        className="group relative block overflow-hidden rounded-3xl bg-white border border-stone-200/60 shadow-sm hover:shadow-stone-100 hover:border-stone-400 mb-10 transition-all duration-300 hover:-translate-y-1"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50"></div>

        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
          {/* Date section */}
          <div className="md:w-[35%] w-full flex flex-col items-center md:items-start text-center md:text-left gap-4 md:border-r border-stone-100 md:pr-8">
            <div className="size-16 rounded-2xl bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100 shadow-sm text-stone-600 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-md group-hover:border-stone-200">
              <CalendarDays className="size-7" />
            </div>
            <div className="mt-1">
              <p className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">
                {lunar.solarStr}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-50 border border-stone-100">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Âm lịch:
                </span>
                <span className="text-sm font-semibold text-stone-700">
                  {lunar.lunarDayStr}
                </span>
              </div>
              <p className="text-sm pl-1 flex items-center justify-center md:justify-start gap-1 text-stone-500 mt-2 font-medium">
                Năm {lunar.lunarYear}
              </p>
            </div>
          </div>

          {/* Events summary */}
          <div className="md:w-[65%] w-full flex-1">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-500 uppercase tracking-widest flex items-center gap-2.5">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                    </span>
                    Sự kiện 30 ngày tới ({upcomingEvents.length})
                  </p>
                  <ArrowRight className="size-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {upcomingEvents.slice(0, 4).map((evt, i) => {
                    
                    /* ── ĐIỂM SỬA 3: ÉP KIỂU AN TOÀN VÀ FALLBACK EVENT TYPE ── */
                    const typeKey = (evt.type as EventType) || "custom_event";
                    const cfg = eventTypeConfig[typeKey] || eventTypeConfig.custom_event;
                    const Icon = cfg.icon;
                    
                    /* ── ĐIỂM SỬA 2: DÙNG UNIQUE KEY THAY VÌ INDEX CHAY ── */
                    const uniqueKey = `${typeKey}-${evt.id || i}`;

                    return (
                      <div
                        key={uniqueKey}
                        className="flex items-center gap-3.5 p-3 rounded-2xl bg-stone-50/50 hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-all duration-300 cursor-pointer"
                      >
                        <div
                          className={`size-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-sm border border-white`}
                        >
                          <Icon className={`size-4 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-stone-700 truncate block">
                            {evt.personName}
                          </span>
                          <span className="text-xs text-stone-500 font-medium pt-0.5 block">
                            {evt.daysUntil === 0
                              ? "Hôm nay"
                              : evt.daysUntil === 1
                                ? "Ngày mai"
                                : `${evt.daysUntil} ngày nữa`}{" "}
                            · {evt.eventDateLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {upcomingEvents.length > 4 && (
                  <p className="text-xs text-stone-400 mt-2 text-center sm:text-left font-medium">
                    + {upcomingEvents.length - 4} sự kiện khác đang chờ...
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-80 py-6">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-stone-400 transition-transform duration-500 group-hover:scale-105 group-hover:text-stone-500">
                  <CalendarDays className="size-6" />
                </div>
                <p className="text-stone-500 text-center font-medium px-4">
                  Không có sự kiện nào trong 30 ngày tới.
                </p>
                <div className="flex items-center gap-2 text-sm text-stone-400 mt-1 font-medium group-hover:text-stone-600 transition-colors">
                  <span>Xem sự kiện trong năm</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* ── Feature Grid ──────────────────────────────────── */}
      <div className="space-y-12">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {publicFeatures.map((feat) => (
              <Link
                key={feat.href}
                href={feat.href}
                className={`group flex flex-col p-6 rounded-2xl bg-white border ${feat.cardBorder} ${feat.cardHover} transition-all duration-300 hover:-translate-y-1 shadow-sm`}
              >
                <div
                  className={`size-14 rounded-xl flex items-center justify-center mb-5 ${feat.iconBg} transition-colors duration-300 group-hover:bg-white border border-transparent ${feat.iconGroupHoverBorder}`}
                >
                  {feat.icon}
                </div>
                <h4 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors">
                  {feat.title}
                </h4>
                <p className="text-sm text-stone-500 line-clamp-2">
                  {feat.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <h3 className="text-xl font-serif font-bold text-rose-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-px bg-rose-200 rounded-full"></span>
              Quản trị viên
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {adminFeatures.map((feat) => (
                <Link
                  key={feat.href}
                  href={feat.href}
                  className={`group flex flex-col p-6 rounded-2xl bg-white border ${feat.cardBorder} ${feat.cardHover} transition-all duration-300 hover:-translate-y-1 shadow-sm`}
                >
                  <div
                    className={`size-14 rounded-xl flex items-center justify-center mb-5 ${feat.iconBg} transition-colors duration-300 group-hover:bg-white border border-transparent ${feat.iconGroupHoverBorder}`}
                  >
                    {feat.icon}
                  </div>
                  <h4 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-rose-700 transition-colors">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-stone-500 line-clamp-2">
                    {feat.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

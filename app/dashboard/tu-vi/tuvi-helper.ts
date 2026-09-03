import { LunarCalendar } from "@dqcai/vn-lunar";

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

// Bảng 60 Hoa Giáp nạp âm chuẩn mực
export const NGU_HANH_NAP_AM: Record<string, string> = {
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

/**
 * Chuẩn hóa chuỗi Can Chi chống lỗi chính tả từ thư viện cũ
 */
export function normalizeCanChi(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/năm|tháng|ngày|giờ/g, "")
    .replace(/kỹ|kỉ/g, "kỷ")
    .replace(/sữu/g, "sửu")
    .replace(/tí/g, "tý")
    .replace(/tị/g, "tỵ")
    .replace(/quí/g, "quý")
    .replace(/bình/g, "bính")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tra cứu nạp âm Bản Mệnh từ Can Chi năm sinh
 */
export function getBanMenh(namCanChi: string): string {
  const key = normalizeCanChi(namCanChi);
  return NGU_HANH_NAP_AM[key] || "Chưa xác định";
}

/**
 * Tính Thiên Can của 12 cung theo nguyên tắc Ngũ Hổ Độn (bắt đầu từ Dần)
 * @param yearCanIndex 0..9 (Giáp=0..Quý=9)
 * @param chiIndex 0..11 (Tý=0..Hợi=11)
 */
export function getPalaceCan(yearCanIndex: number, chiIndex: number): string {
  // Giáp/Kỷ: khởi Bính Dần (2)
  // Ất/Canh: khởi Mậu Dần (4)
  // Bính/Tân: khởi Canh Dần (6)
  // Đinh/Nhâm: khởi Nhâm Dần (8)
  // Mậu/Quý: khởi Giáp Dần (0)
  const canDan = ((yearCanIndex % 5) * 2 + 2) % 10;
  const offsetFromDan = (chiIndex - 2 + 12) % 12;
  const canIndex = (canDan + offsetFromDan) % 10;
  return CAN[canIndex];
}

/**
 * Tính Can Chi của giờ theo nguyên tắc Ngũ Thử Độn (dựa vào Can của Ngày)
 */
export function getHourCanChi(dayCanChi: string, gioIndex: number): string {
  const normDay = normalizeCanChi(dayCanChi);
  const parts = normDay.split(" ");
  const dayCanStr = parts[0] || "";
  const dayCanIdx = CAN.findIndex(c => c.toLowerCase() === dayCanStr.toLowerCase());
  
  if (dayCanIdx === -1) {
    return `Giờ ${CHI[gioIndex] || ""}`;
  }
  
  // Ngũ Thử Độn:
  // Giáp/Kỷ -> Giáp Tý (0)
  // Ất/Canh -> Bính Tý (2)
  // Bính/Tân -> Mậu Tý (4)
  // Đinh/Nhâm -> Canh Tý (6)
  // Mậu/Quý -> Nhâm Tý (8)
  const canTy = ((dayCanIdx % 5) * 2) % 10;
  const canGio = (canTy + gioIndex) % 10;
  return `${CAN[canGio]} ${CHI[gioIndex]}`;
}

/**
 * Tính số tuổi bắt đầu Đại Vận (10 năm) cho 12 cung
 * @param cucNumber Số cục (2: Thủy, 3: Mộc, 4: Kim, 5: Thổ, 6: Hỏa)
 * @param menhChiIndex Vị trí cung Mệnh (0: Tý .. 11: Hợi)
 * @param isThuan Dương Nam / Âm Nữ = true (thuận); Âm Nam / Dương Nữ = false (nghịch)
 */
export function calculateDaiVan(
  cucNumber: number,
  menhChiIndex: number,
  isThuan: boolean
): Record<number, number> {
  const daiVanMap: Record<number, number> = {};
  for (let step = 0; step < 12; step++) {
    const chi = isThuan 
      ? (menhChiIndex + step) % 12 
      : (menhChiIndex - step + 12) % 12;
    daiVanMap[chi] = cucNumber + step * 10;
  }
  return daiVanMap;
}

/**
 * Ánh xạ màu sắc Ngũ Hành (hỗ trợ cả mã số 1..5 và chuỗi chữ)
 */
export function getElementColor(nguHanh: string | number | undefined, isChinhTinh: boolean = false): string {
  if (nguHanh === undefined || nguHanh === null) {
    return isChinhTinh ? "text-stone-800" : "text-stone-600";
  }

  // Nếu là số từ thư viện tuvi-neo:
  // 1: Kim, 2: Thủy, 3: Mộc, 4: Hỏa, 5: Thổ
  if (typeof nguHanh === "number") {
    switch (nguHanh) {
      case 1: return "text-slate-600";    // Kim
      case 2: return "text-blue-600";     // Thủy
      case 3: return "text-emerald-600";  // Mộc
      case 4: return "text-red-600";      // Hỏa
      case 5: return "text-amber-600";    // Thổ
      default: return isChinhTinh ? "text-stone-800" : "text-stone-600";
    }
  }

  // Nếu là chuỗi
  const nh = String(nguHanh).toLowerCase();
  if (nh.includes("kim") || nh === "k" || nh === "1") return "text-slate-600";
  if (nh.includes("thủy") || nh.includes("thuy") || nh === "t" || nh === "2") return "text-blue-600";
  if (nh.includes("mộc") || nh.includes("moc") || nh === "m" || nh === "3") return "text-emerald-600";
  if (nh.includes("hỏa") || nh.includes("hoa") || nh === "h" || nh === "4") return "text-red-600";
  if (nh.includes("thổ") || nh.includes("tho") || nh === "o" || nh === "5") return "text-amber-600";

  return isChinhTinh ? "text-stone-800" : "text-stone-600";
}

/**
 * Định dạng nhãn và màu sắc cho Độ sáng sao (Đắc/Hãm/Miếu/Vượng)
 */
export function formatStarStatus(status?: string): { label: string; className: string } | null {
  if (!status || status === "N" || status === "-") return null;
  const s = status.toUpperCase().trim();
  switch (s) {
    case "M":
      return { label: "(M)", className: "text-red-600 font-bold" };
    case "V":
      return { label: "(V)", className: "text-orange-500 font-bold" };
    case "Đ":
    case "D":
      return { label: "(Đ)", className: "text-emerald-600 font-bold" };
    case "B":
      return { label: "(B)", className: "text-stone-400 font-normal" };
    case "H":
      return { label: "(H)", className: "text-slate-500 font-semibold underline decoration-dotted" };
    default:
      return { label: `(${s})`, className: "text-stone-500" };
  }
}

/**
 * Tính Can Chi Tứ Trụ chuẩn xác (Năm, Tháng, Ngày, Giờ)
 */
export function getFourPillars(params: {
  isLunar: boolean;
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
}): {
  nam: string;
  thang: string;
  ngay: string;
  gio: string;
  gioIndex: number;
  dayCanChi: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  yearCanIndex: number;
} {
  const { isLunar, day, month, year, hour } = params;

  // Xử lý mốc giờ Tý (23h trở đi tính sang ngày hôm sau)
  const isTyNextDay = hour >= 23;
  const gioIndex = isTyNextDay ? 0 : Math.floor((hour + 1) / 2) % 12;

  let calendar;
  if (!isLunar) {
    // Nếu dương lịch và sau 23h, tính cho ngày hôm sau
    const calcDay = isTyNextDay ? day + 1 : day;
    const testDate = new Date(year, month - 1, calcDay);
    calendar = LunarCalendar.fromSolar(
      testDate.getDate(),
      testDate.getMonth() + 1,
      testDate.getFullYear()
    );
  } else {
    // Nếu âm lịch và sau 23h, sang ngày hôm sau
    const calcDay = isTyNextDay ? day + 1 : day;
    calendar = LunarCalendar.fromLunar(calcDay, month, year);
  }

  const namCanChi = calendar.yearCanChi;
  const thangCanChi = calendar.monthCanChi;
  const ngayCanChi = calendar.dayCanChi;
  const gioCanChi = getHourCanChi(ngayCanChi, gioIndex);

  // Tính index của Can năm (0..9)
  const normNam = normalizeCanChi(namCanChi);
  const firstWord = normNam.split(" ")[0] || "";
  const yearCanIndex = CAN.findIndex(c => c.toLowerCase() === firstWord.toLowerCase()) ?? ((year - 4) % 10);

  return {
    nam: namCanChi,
    thang: thangCanChi,
    ngay: ngayCanChi,
    gio: gioCanChi,
    gioIndex,
    dayCanChi: ngayCanChi,
    lunarDay: calendar.lunarDate.day,
    lunarMonth: calendar.lunarDate.month,
    lunarYear: calendar.lunarDate.year,
    yearCanIndex: yearCanIndex >= 0 ? yearCanIndex : 0,
  };
}

// utils/lunarConverter.ts

/**
 * Tiện ích chuyển đổi lịch Âm - Dương theo tiêu chuẩn Việt Nam
 * Dựa trên thuật toán Hồ Ngọc Đức (Múi giờ UTC+7)
 */

// @ts-ignore: Bỏ qua cảnh báo TypeScript vì thư viện am-lich được viết bằng JS thuần
import { lunar2solar, solar2lunar } from "am-lich";

/**
 * Chuyển đổi ngày Âm lịch sang Dương lịch
 * @param lunarDay Ngày âm lịch (1-30)
 * @param lunarMonth Tháng âm lịch (1-12)
 * @param lunarYear Năm âm lịch
 * @param isLeapMonth Đánh dấu tháng nhuận (0: không nhuận, 1: nhuận). Gia phả thường dùng 0.
 * @returns Mảng [ngày, tháng, năm] dương lịch
 */
export function getSolarDate(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  isLeapMonth: number = 0
): [number, number, number] {
  try {
    // Số 7 ở cuối là timeZone của Việt Nam (UTC+7)
    const solarDate = lunar2solar(lunarDay, lunarMonth, lunarYear, isLeapMonth, 7);
    
    // Đảm bảo trả về đúng định dạng mảng [ngày, tháng, năm]
    return [solarDate[0], solarDate[1], solarDate[2]];
  } catch (error) {
    console.error("Lỗi khi chuyển đổi Âm sang Dương:", error);
    // Trả về dữ liệu an toàn để không làm sập giao diện nếu có lỗi
    return [lunarDay, lunarMonth, lunarYear];
  }
}

/**
 * Chuyển đổi ngày Dương lịch sang Âm lịch (Dùng khi muốn hiển thị ngày âm hiện tại)
 * @param solarDay Ngày dương lịch
 * @param solarMonth Tháng dương lịch
 * @param solarYear Năm dương lịch
 * @returns Object chứa ngày, tháng, năm âm lịch và cờ nhuận (isLeap)
 */
export function getLunarDate(
  solarDay: number,
  solarMonth: number,
  solarYear: number
): { day: number; month: number; year: number; isLeap: boolean } {
  try {
    // Số 7 ở cuối là timeZone của Việt Nam (UTC+7)
    const lunarDate = solar2lunar(solarDay, solarMonth, solarYear, 7);
    
    return {
      day: lunarDate[0],
      month: lunarDate[1],
      year: lunarDate[2],
      isLeap: lunarDate[3] === 1,
    };
  } catch (error) {
    console.error("Lỗi khi chuyển đổi Dương sang Âm:", error);
    return { day: solarDay, month: solarMonth, year: solarYear, isLeap: false };
  }
}

"use server";

export async function getLuangiaiAI(data: {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy GEMINI_API_KEY trên hệ thống Vercel.";
  }

  const prompt = `Hãy đóng vai một bậc thầy Tử Vi Đẩu Số. Viết một bài luận giải chuyên sâu, mang âm hưởng huyền bí nhưng dễ hiểu cho đương số sau:
  - Tên: ${data.name}
  - Giới tính: ${data.gender}
  - Âm Dương: ${data.amDuong}
  - Bản Mệnh: ${data.banMenh}
  - Cục: ${data.cuc}
  - Các sao tại cung Mệnh: ${data.chinhTinh}

  Yêu cầu:
  1. Nhận xét tổng quan về tính cách, khí chất dựa trên Bản mệnh và sao tại cung Mệnh.
  2. Đưa ra một vài lời khuyên trọng tâm giúp đương số phát huy điểm mạnh, hạn chế điểm yếu.
  3. Không dùng định dạng phức tạp, chỉ dùng văn bản thuần túy có dấu xuống dòng. Giới hạn khoảng 250 - 300 chữ.`;

  // Danh sách các mô hình AI dự phòng (Từ mới nhất đến các bản ổn định nhất)
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-pro"
  ];

  let lastErrorMessage = "";

  // Tự động dò tìm: Thử gọi từng model, nếu model nào còn sống thì lấy kết quả và thoát.
  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const result = await response.json();

      // Nếu máy chủ Google đồng ý và trả về văn bản thành công
      if (response.ok && result.candidates && result.candidates.length > 0) {
        return result.candidates[0].content.parts[0].text;
      } else {
        // Lưu lại lỗi nhưng KHÔNG dừng lại, tiếp tục vòng lặp thử model tiếp theo
        lastErrorMessage = result.error?.message || "Lỗi không xác định";
      }
    } catch (error: any) {
      lastErrorMessage = error.message;
    }
  }

  // Nếu đã chạy qua toàn bộ danh sách mà vẫn lỗi, chứng tỏ API Key của bạn có vấn đề
  return `LỖI TỪ GOOGLE AI: Máy chủ từ chối kết nối. Lỗi cuối cùng: ${lastErrorMessage}
  
  💡 HƯỚNG DẪN KHẮC PHỤC DỨT ĐIỂM:
  Mã API Key của bạn khả năng cao đã bị khóa hoặc hết hạn. Bạn hãy dùng một tài khoản Gmail KHÁC, vào https://aistudio.google.com/app/apikey tạo một mã API Key mới tinh. Dán thay thế vào Vercel và Redeploy lại là chắc chắn 100% thành công!`;
}

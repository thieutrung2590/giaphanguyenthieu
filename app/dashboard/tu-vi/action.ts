"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

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
    return "Lỗi [MÃ 01]: Không tìm thấy GEMINI_API_KEY. Hãy chắc chắn bạn đã điền đúng tên biến là GEMINI_API_KEY trong tab Environment Variables trên Vercel.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    // Trả về lỗi CHÍNH XÁC từ Google để bắt bệnh
    return `LỖI TỪ GOOGLE AI: ${error.message || JSON.stringify(error)}
    
    => HƯỚNG DẪN KHẮC PHỤC:
    1. Nếu lỗi là "API key not valid": Khóa API của bạn bị sai, hãy vào Google AI Studio tạo khóa khác và thay vào Vercel.
    2. Nếu lỗi là "User location is not supported": Máy chủ Vercel đang đặt ở quốc gia bị Google hạn chế.`;
  }
}

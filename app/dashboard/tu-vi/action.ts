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

  try {
    // GỌI TRỰC TIẾP MÁY CHỦ GOOGLE BẰNG FETCH API (Không qua thư viện trung gian)
    // Cố định dùng model gemini-1.5-flash mới nhất và siêu tốc độ
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
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

    // Nếu Google từ chối, in thẳng lỗi ra màn hình bằng tiếng Việt
    if (!response.ok) {
      return `LỖI TỪ GOOGLE AI: ${result.error?.message || "Không xác định"}\n\n💡 CÁCH KHẮC PHỤC DỨT ĐIỂM:\nMã API Key hiện tại của bạn không có quyền truy cập. Bạn hãy vào https://aistudio.google.com/app/apikey, bấm nút "Create API key" để tạo một mã MỚI TINH. Sau đó dán đè mã mới lên mã cũ trong Vercel (Tab Settings -> Environment Variables) và Redeploy lại là xong!`;
    }

    // Trả về đoạn văn bản AI đã luận giải
    return result.candidates[0].content.parts[0].text;
  } catch (error: any) {
    return `LỖI KẾT NỐI: ${error.message}`;
  }
}

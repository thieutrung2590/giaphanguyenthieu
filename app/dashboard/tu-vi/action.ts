"use server";

export async function getLuangiaiAI(data: {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
}) {
  // Lấy khóa API của ChatGPT từ Vercel
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy OPENAI_API_KEY. Vui lòng thêm biến OPENAI_API_KEY vào phần Environment Variables trên Vercel.";
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
    // Gọi trực tiếp đến máy chủ của OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Mô hình mới và siêu tốc của ChatGPT
        messages: [
          { role: "system", content: "Bạn là một chuyên gia Tử Vi Đẩu Số uyên bác." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7, // Độ sáng tạo của văn bản
        max_tokens: 800, // Giới hạn độ dài câu trả lời
      }),
    });

    const result = await response.json();

    // Xử lý nếu máy chủ OpenAI báo lỗi (sai key, hết tiền...)
    if (!response.ok) {
      return `LỖI TỪ OPENAI: ${result.error?.message || "Không xác định"}
      
      💡 GỢI Ý KHẮC PHỤC:
      1. Đảm bảo bạn đã nhập đúng OPENAI_API_KEY trên Vercel.
      2. OpenAI yêu cầu tài khoản phải nạp sẵn tối thiểu 5$ (Credit) thì mới có thể sử dụng API. Nếu tài khoản của bạn là tài khoản miễn phí mới tạo chưa nạp thẻ, hệ thống sẽ báo lỗi "insufficient_quota".`;
    }

    // Trả kết quả luận giải về màn hình
    return result.choices[0].message.content;
  } catch (error: any) {
    return `LỖI KẾT NỐI MẠNG: ${error.message}`;
  }
}

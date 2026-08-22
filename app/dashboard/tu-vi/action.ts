"use server";

export async function getLuangiaiAI(data: {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
  tuanTriet?: string; 
  category?: string;
  viewYear?: string; // Bổ sung thông tin Năm xem hạn
}) {
  // Đã chuyển sang dùng OPENROUTER_API_KEY
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy OPENROUTER_API_KEY trên Vercel.";
  }

  let specificPrompt = "";
  const cat = data.category || "tong_quan";
  const namXemHan = data.viewYear || "hiện tại";

  if (cat === "cong_danh") {
    specificPrompt = `Tập trung chuyên sâu phân tích về đường Công danh, Sự nghiệp, Quan lộc và Khả năng lãnh đạo của đương số dựa trên Mệnh cục và các chính tinh. Đưa ra lời khuyên về định hướng nghề nghiệp phù hợp.`;
  } else if (cat === "tai_loc") {
    specificPrompt = `Tập trung chuyên sâu phân tích về Tài lộc, Tiền bạc, khả năng quản lý tài chính và cơ hội làm giàu của đương số.`;
  } else if (cat === "tinh_duyen") {
    specificPrompt = `Tập trung chuyên sâu phân tích về Tình duyên, Hôn nhân, Gia đạo và các mối quan hệ tình cảm của đương số.`;
  } else if (cat === "van_han") {
    specificPrompt = `Tập trung chuyên sâu phân tích về VẬN HẠN TRONG NĂM ${namXemHan} của đương số. Đưa ra dự đoán về những cơ hội, thách thức trong năm ${namXemHan} và lời khuyên để hóa giải hung hiểm, đón nhận cát tường.`;
  } else {
    specificPrompt = `Nhận xét tổng quan về tính cách, khí chất và định hướng cuộc đời dựa trên Bản mệnh và sao tại cung Mệnh.`;
  }

  const tuanTrietInfo = data.tuanTriet ? `- Mức độ ảnh hưởng của Tuần/Triệt: ${data.tuanTriet}` : "";

  const prompt = `Hãy đóng vai một bậc thầy Tử Vi Đẩu Số uyên bác. Hãy viết một bài luận giải chi tiết, mang âm hưởng huyền bí nhưng thực tế cho đương số sau:
  - Tên: ${data.name}
  - Giới tính: ${data.gender}
  - Âm Dương: ${data.amDuong}
  - Bản Mệnh: ${data.banMenh}
  - Cục: ${data.cuc}
  - Các sao tại cung Mệnh: ${data.chinhTinh}
  - Năm đang xem vận hạn: ${namXemHan}
  ${tuanTrietInfo}

  YÊU CẦU TRỌNG TÂM:
  ${specificPrompt}
  
  LƯU Ý ĐẶC BIỆT: Nếu có thông tin Tuần/Triệt, hãy phân tích kỹ sự ảnh hưởng của Tuần Không / Triệt Lộ đến những khó khăn, cản trở của đương số. Không dùng định dạng quá phức tạp, chỉ dùng văn bản thuần túy có dấu xuống dòng rõ ràng, độ dài khoảng 250 - 350 chữ.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        // OpenRouter khuyến nghị thêm 2 header này (có thể để URL mặc định của bạn)
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "TuVi App"
      },
      body: JSON.stringify({
        model: "openrouter/free", // Sử dụng model free của OpenRouter
        messages: [
          { role: "system", content: "Bạn là một chuyên gia Tử Vi Đẩu Số am hiểu sâu sắc văn hóa phương Đông." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7, 
        max_tokens: 2048, 
      }),
    });

    const result = await response.json();

    if (response.ok && result.choices && result.choices.length > 0) {
      return result.choices[0].message.content;
    } else {
      const errorMsg = result.error?.message || "Lỗi không xác định từ OpenRouter";
      return `LỖI TỪ AI: ${errorMsg}`;
    }
  } catch (error: any) {
    return `LỖI TỪ AI: ${error.message}`;
  }
}

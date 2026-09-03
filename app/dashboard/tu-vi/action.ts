"use server";

export interface LuangiaiAIData {
  name: string;
  gender: string;
  amDuong: string;
  banMenh: string;
  cuc: string;
  chinhTinh: string;
  thanCu?: string;
  tuanTriet?: string; 
  category?: string;
  viewYear?: string;
  quanLocInfo?: string;
  taiBachInfo?: string;
  phuTheInfo?: string;
  phucDucInfo?: string;
  thienDiInfo?: string;
}

export async function getLuangiaiAI(data: LuangiaiAIData) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return "Lỗi: Không tìm thấy GROQ_API_KEY trên hệ thống.";
  }

  let specificPrompt = "";
  const cat = data.category || "tong_quan";
  const namXemHan = data.viewYear || "hiện tại";

  if (cat === "cong_danh") {
    specificPrompt = `Tập trung chuyên sâu phân tích về đường CÔNG DANH, SỰ NGHIỆP, QUAN LỘC và KHẢ NĂNG LÃNH ĐẠO của đương số:
- Kết hợp cung Mệnh, cung Thân (${data.thanCu || "chưa rõ"}) và đặc biệt là CUNG QUAN LỘC (${data.quanLocInfo || "Vô chính diệu"}).
- Đưa ra lời khuyên cụ thể về môi trường làm việc phù hợp (kinh doanh, nhà nước, kỹ thuật, học thuật, nghệ thuật...), thế mạnh cần phát huy và giai đoạn thăng tiến rực rỡ.`;
  } else if (cat === "tai_loc") {
    specificPrompt = `Tập trung chuyên sâu phân tích về TÀI LỘC, TIỀN TÀI và KHẢ NĂNG QUẢN LÝ TÀI CHÍNH của đương số:
- Kết hợp cung Mệnh và CUNG TÀI BẠCH (${data.taiBachInfo || "Vô chính diệu"}).
- Dự đoán về nguồn tiền (chính tài hay phụ tài, tích lũy hay đầu cơ), cơ hội làm giàu, thời điểm hanh thông và các nguy cơ thất thoát cần đề phòng.`;
  } else if (cat === "tinh_duyen") {
    specificPrompt = `Tập trung chuyên sâu phân tích về TÌNH DUYÊN, HÔN NHÂN, GIA ĐẠO:
- Phân tích CUNG PHU THÊ (${data.phuTheInfo || "Vô chính diệu"}) và CUNG PHÚC ĐỨC (${data.phucDucInfo || "Vô chính diệu"}).
- Luận về tính cách phối ngẫu, độ hòa hợp, những thử thách trong hôn nhân và lời khuyên để gia đạo êm ấm, bền vững.`;
  } else if (cat === "van_han") {
    specificPrompt = `Tập trung chuyên sâu phân tích về VẬN HẠN TRONG NĂM ${namXemHan} của đương số:
- Dựa trên Mệnh, Cục, Cung Thân (${data.thanCu || "chưa rõ"}), thế đứng các cung và ảnh hưởng của Tuần/Triệt.
- Đưa ra dự đoán về cơ hội phát triển, những tháng hoặc lĩnh vực cần chú ý (sức khỏe, tài chính, thị phi), cùng phương thức tu dưỡng hóa giải hung hiểm, đón nhận cát tường.`;
  } else {
    specificPrompt = `Nhận xét tổng quan về tính cách, khí chất, căn nguyên vận mệnh và định hướng cuộc đời:
- Luận giải sự tương phối giữa Bản mệnh (${data.banMenh}) và Cục (${data.cuc}), Âm Dương thuận/nghịch lý.
- Phân tích khí chất của các chính tinh và phụ tinh tại cung Mệnh (${data.chinhTinh}), vị trí ${data.thanCu || ""}, cung Thiên Di (${data.thienDiInfo || ""}).
- Đưa ra triết lý sống và kim chỉ nam giúp đương số làm chủ số mệnh.`;
  }

  const tuanTrietInfo = data.tuanTriet ? `- Ảnh hưởng Tuần/Triệt tại Mệnh: ${data.tuanTriet}` : "";
  const thanCuInfo = data.thanCu ? `- Vị trí Thân: ${data.thanCu}` : "";

  const prompt = `Hãy đóng vai một bậc thầy Tử Vi Đẩu Số uyên bác, thấu triệt dịch lý Đông phương và nhân sinh thực tế. Hãy viết một bài luận giải sắc sảo, truyền cảm hứng và chân thực cho đương số:
  - Họ tên: ${data.name}
  - Giới tính: ${data.gender}
  - Âm Dương: ${data.amDuong}
  - Bản Mệnh: ${data.banMenh}
  - Cục: ${data.cuc}
  - Các sao tại Cung Mệnh: ${data.chinhTinh}
  ${thanCuInfo}
  ${tuanTrietInfo}
  ${data.quanLocInfo ? `- Cung Quan Lộc: ${data.quanLocInfo}` : ""}
  ${data.taiBachInfo ? `- Cung Tài Bạch: ${data.taiBachInfo}` : ""}
  ${data.phuTheInfo ? `- Cung Phu Thê: ${data.phuTheInfo}` : ""}
  ${data.phucDucInfo ? `- Cung Phúc Đức: ${data.phucDucInfo}` : ""}
  ${data.thienDiInfo ? `- Cung Thiên Di: ${data.thienDiInfo}` : ""}
  - Năm đang xem vận hạn: ${namXemHan}

  YÊU CẦU TRỌNG TÂM:
  ${specificPrompt}
  
  LƯU Ý QUAN TRỌNG:
  - Phân tích sâu sắc, dùng từ ngữ chuẩn mực Tử Vi nhưng hành văn hiện đại, dễ hiểu, tránh sáo rỗng.
  - Phân tích kỹ tác động tương sinh tương khắc giữa Bản mệnh và Ngũ hành của các sao.
  - Văn phong súc tích, mạch lạc, có dấu xuống dòng rõ ràng, độ dài khoảng 300 - 450 từ.`;

  const modelsToTry = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b"
  ];

  let lastErrorMessage = "";

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "Bạn là một đại sư Tử Vi Đẩu Số am hiểu sâu sắc kinh dịch và văn hóa phương Đông." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7, 
          max_tokens: 1400, 
        }),
      });

      const result = await response.json();

      if (response.ok && result.choices && result.choices.length > 0) {
        return result.choices[0].message.content;
      } else {
        lastErrorMessage = result.error?.message || "Lỗi không xác định";
      }
    } catch (error: unknown) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  return `LỖI TỪ AI: ${lastErrorMessage}`;
}

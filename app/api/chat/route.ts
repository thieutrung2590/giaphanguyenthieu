import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Thêm hàm GET để bạn có thể kiểm tra trực tiếp đường dẫn trên trình duyệt
export async function GET() {
  return NextResponse.json({ status: 'API Chatbot đã kết nối thành công, hệ thống sẵn sàng nhận yêu cầu POST!' });
}

export async function POST(req: Request) {
  console.log("=== BẮT ĐẦU XỬ LÝ YÊU CẦU CHATBOT ===");
  try {
    const { message } = await req.json();
    console.log("1. Đã nhận tin nhắn từ người dùng:", message);

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      console.error("LỖI: Chưa có biến môi trường GEMINI_API_KEY");
      throw new Error("Chưa cấu hình Gemini API.");
    }

    console.log("2. Biến môi trường đã load thành công.");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    // 3. Tự động lấy danh sách mô hình Gemini
    console.log("3. Đang kiểm tra mô hình Gemini hợp lệ...");
    let selectedModel = 'gemini-1.5-flash';
    try {
      const modelRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        const availableModels = modelData.models || [];
        
        const validModels = availableModels.filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini')
        );

        if (validModels.length > 0) {
          const flashModel = validModels.find((m: any) => m.name.includes('flash'));
          const chosen = flashModel || validModels[0];
          selectedModel = chosen.name.replace('models/', '');
          console.log("-> Đã chọn mô hình:", selectedModel);
        }
      } else {
        console.log("-> Không thể fetch models, dùng mặc định:", selectedModel);
      }
    } catch (fetchError) {
      console.error('Lỗi khi fetch models:', fetchError);
    }

    // 4. Truy vấn dữ liệu từ Supabase
    console.log("4. Đang truy vấn dữ liệu từ bảng members...");
    const { data: members, error } = await supabase
      .from('members')
      .select('id, full_name, gender, birth_date, death_date, biography')
      .limit(100);

    if (error) {
      console.error('Lỗi Supabase Query:', error);
      throw new Error('Không thể lấy dữ liệu từ cơ sở dữ liệu.');
    }

    console.log("-> Lấy dữ liệu thành công. Số lượng:", members?.length);

    const contextData = members && members.length > 0
      ? members.map((m: any) => 
          `- Họ tên: ${m.full_name || 'Không rõ'}, Giới tính: ${m.gender || 'Không rõ'}, Ngày sinh: ${m.birth_date || 'Không rõ'}, Ngày mất: ${m.death_date || 'Không rõ'}, Tiểu sử/Ghi chú: ${m.biography || 'Không có'}`
        ).join('\n')
      : 'Hiện tại chưa có dữ liệu thành viên nào trong gia phả.';

    const prompt = `Bạn là một trợ lý AI quản lý gia phả dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc của bạn là ưu tiên tuyệt đối tính CHÍNH XÁC và ĐÁNG TIN CẬY. 
Chỉ cung cấp thông tin dựa trên dữ liệu gia phả được cung cấp dưới đây. Tuyệt đối không suy đoán, không bịa đặt, không tự tạo thông tin. Nếu dữ liệu dưới đây không có hoặc không đủ để trả lời câu hỏi của người dùng, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

DỮ LIỆU GIA PHẢ:
${contextData}

CÂU HỎI CỦA NGƯỜI DÙNG: 
${message}`;

    console.log("5. Đang gửi dữ liệu đến Gemini...");
    const model = genAI.getGenerativeModel({ model: selectedModel });
    const result = await model.generateContent(prompt);
    
    console.log("6. Gemini phản hồi thành công!");
    return NextResponse.json({ reply: result.response.text() });
    
  } catch (error: any) {
    console.error('!!! LỖI QUÁ TRÌNH XỬ LÝ API:', error);
    return NextResponse.json(
      { reply: 'Xin lỗi, hệ thống đang gặp sự cố khi kết nối dữ liệu. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}

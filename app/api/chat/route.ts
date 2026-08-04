import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Thuật toán lột bỏ dấu tiếng Việt để phục vụ Fuzzy Search
function removeAccents(str: string) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi: Chưa cấu hình đủ biến môi trường (GROQ_API_KEY hoặc SUPABASE_KEY) trên Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. CHUẨN BỊ TỪ KHÓA TÌM KIẾM (FUZZY SEARCH)
    const lowerMsg = message.toLowerCase();
    const unaccentedMsg = removeAccents(lowerMsg);
    
    // Bỏ các từ thừa tiếng Việt (đã bỏ dấu) để tập trung tìm đích danh
    let cleanMsg = unaccentedMsg.replace(/(thong tin|cho biet|hoi ve|ai la|tim|ve|cua|nhung|nguoi|ten|cha|me|vo|chong|con|cai|gia|pha|ban|su kien|gio|hop|ngay)/g, ' ').trim();
    const keywords = cleanMsg.split(/[ \n\t.,?]+/).filter((w: string) => w.length > 1);

    // 2. TÍCH HỢP TÌM KIẾM SỰ KIỆN (custom_events)
    let eventsData: any[] = [];
    const isEventQuery = /(su kien|gio|hop|le|ngay|ky niem)/.test(unaccentedMsg);
    
    if (isEventQuery) {
      const { data: events, error: eventError } = await supabase
        .from('custom_events')
        .select('*')
        .limit(20); // Lấy 20 sự kiện gần nhất
        
      if (!eventError && events) {
        eventsData = events.map((e: any) => {
          const clean: any = {};
          for (const key in e) {
            if (!['created_at', 'updated_at'].includes(key.toLowerCase()) && e[key] !== null) {
              clean[key] = e[key];
            }
          }
          return clean;
        });
      }
    }

    // 3. TRUY XUẤT VÀ LỌC THÀNH VIÊN GIA PHẢ BẰNG FUZZY SEARCH
    const { data: allPersons, error: personError, count } = await supabase
      .from('persons')
      .select('*', { count: 'exact' })
      .limit(1500); // Lấy số lượng lớn vào RAM để xử lý lọc không dấu

    if (personError) {
      return NextResponse.json({ reply: `Lỗi truy xuất bảng persons: ${personError.message}` }, { status: 500 });
    }

    const totalMembers = count || (allPersons ? allPersons.length : 0);
    let finalPersons: any[] = [];
    let relationshipsData: any[] = [];

    if (allPersons && allPersons.length > 0) {
      let mainPersons = allPersons;

      // Áp dụng thuật toán tìm kiếm không dấu
      if (keywords.length > 0 && !unaccentedMsg.includes('bao nhieu') && !unaccentedMsg.includes('tong so')) {
        mainPersons = allPersons.filter((p: any) => {
          const rawName = p.full_name || p.name || p.ho_ten || p.title || '';
          const nameStr = removeAccents(rawName.toLowerCase());
          return keywords.every((kw: string) => nameStr.includes(kw)); // Khớp tuyệt đối mọi từ khóa nhưng không cần dấu
        });
      }

      mainPersons = mainPersons.slice(0, 5); // Giới hạn 5 người khớp nhất để tiết kiệm Token
      finalPersons = [...mainPersons];

      // 4. TRUY XUẤT BẢNG MỐI QUAN HỆ (Relationships)
      if (mainPersons.length > 0) {
        const mainIds = mainPersons.map(p => p.id).filter(Boolean);

        if (mainIds.length > 0) {
          const { data: rels } = await supabase
            .from('relationships')
            .select('*')
            .or(`person_id.in.(${mainIds.join(',')}),related_person_id.in.(${mainIds.join(',')})`)
            .limit(50);

          if (rels && rels.length > 0) {
            relationshipsData = rels;

            // Tìm những người thân chưa có trong mảng finalPersons
            const relativeIds = new Set<string>();
            rels.forEach(r => {
              if (r.person_id && !mainIds.includes(r.person_id)) relativeIds.add(r.person_id);
              if (r.related_person_id && !mainIds.includes(r.related_person_id)) relativeIds.add(r.related_person_id);
            });

            const relIdsArray = Array.from(relativeIds);
            if (relIdsArray.length > 0) {
              // Tìm trực tiếp trong bộ nhớ RAM (allPersons) trước để tiết kiệm số lần gọi Database
              const foundRelatives = allPersons.filter(p => relIdsArray.includes(p.id));
              finalPersons = [...finalPersons, ...foundRelatives];
              
              // Nếu RAM chưa đủ (do limit 1500), gọi thêm DB để lấy nốt người thiếu
              const foundIds = foundRelatives.map(p => p.id);
              const missingIds = relIdsArray.filter(id => !foundIds.includes(id));
              
              if (missingIds.length > 0) {
                 const { data: extraRelatives } = await supabase.from('persons').select('*').in('id', missingIds);
                 if (extraRelatives) finalPersons = [...finalPersons, ...extraRelatives];
              }
            }
          }
        }
      }
    }

    // Lọc trùng lặp & Dọn dẹp JSON
    const uniquePersons = Array.from(new Map(finalPersons.map(p => [p.id, p])).values());
    const cleanPersons = uniquePersons.map((p: any) => {
      const clean: any = {};
      for (const key in p) {
        const lowerKey = key.toLowerCase();
        if (['created_at', 'updated_at', 'avatar_url', 'image', 'uuid', 'photo'].includes(lowerKey)) continue;
        if (p[key] !== null && p[key] !== '') clean[key] = p[key];
      }
      return clean;
    });

    const cleanRels = relationshipsData.map((r: any) => {
      const clean: any = {};
      for (const key in r) {
        if (!['created_at', 'updated_at'].includes(key.toLowerCase()) && r[key] !== null) clean[key] = r[key];
      }
      return clean;
    });

    // 5. XÂY DỰNG PROMPT THÔNG MINH CHO GROQ AI
    const systemPrompt = `Bạn là "Trợ lý Gia Phả" của dòng họ Nguyễn Thiệu. Nguyên tắc bắt buộc: Ưu tiên tuyệt đối tính CHÍNH XÁC, không suy đoán hay bịa đặt thông tin. Xưng hô là "Trợ lý Gia Phả" và gọi người dùng là "bạn" hoặc "thành viên".
Nếu không có dữ liệu để kết luận, hãy nói đúng nguyên văn: "Không đủ thông tin để kết luận".

THÔNG TIN TỔNG QUAN:
- Gia phả hiện tại có tổng cộng: ${totalMembers} thành viên.

DỮ LIỆU THÀNH VIÊN (Kèm ID):
${JSON.stringify(cleanPersons)}

DỮ LIỆU MỐI QUAN HỆ (Bảng Liên Kết):
${JSON.stringify(cleanRels)}

DỮ LIỆU SỰ KIỆN SẮP TỚI (Nếu có):
${JSON.stringify(eventsData)}

HƯỚNG DẪN TRÌNH BÀY (QUAN TRỌNG TỐI THƯỢNG):
1. Đối chiếu chính xác ID giữa bảng THÀNH VIÊN và MỐI QUAN HỆ để biết ai là cha, mẹ, vợ, chồng, con. Không hiển thị dãy số ID ra màn hình.
2. NẾU NGƯỜI DÙNG HỎI VỀ GIA ĐÌNH, CON CÁI: BẮT BUỘC phải nhóm danh sách người thân (đặc biệt là con cái) và xuất ra dưới dạng BẢNG (Table Markdown) thật đẹp mắt.
- Cấu trúc cột của bảng phải bao gồm: | Họ tên | Giới tính | Ngày sinh | Mối quan hệ |
3. NẾU CÓ DỮ LIỆU SỰ KIỆN: Hãy trình bày lịch sự, gạch đầu dòng rõ ràng ngày tháng và nội dung sự kiện.`;

    // 6. GỌI API LLaMA 3.1 CỦA GROQ
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1, // Khóa chặt để tuân thủ luật Markdown
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Lỗi kết nối đến Groq API');
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Hàm bỏ dấu tiếng Việt
function removeAccents(str: string) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// 2. Hàm ép JSON sang CSV
function jsonToCsv(items: any[]) {
  if (!items || items.length === 0) return '';
  const keySet = new Set<string>();
  
  items.forEach(item => {
    Object.keys(item).forEach(key => {
      if (item[key] !== null && item[key] !== '') keySet.add(key);
    });
  });
  
  const headers = Array.from(keySet);
  const csvRows = [headers.join(',')];

  for (const row of items) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) return '';
      const strVal = String(val).trim();
      if (strVal.includes(',') || strVal.includes('\n') || strVal.includes('"')) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    });
    if (values.some(v => v !== '')) csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ reply: 'Vui lòng nhập câu hỏi.' }, { status: 400 });

    // Trở lại sử dụng GROQ_API_KEY
    const groqApiKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!groqApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ reply: 'Lỗi cấu hình biến môi trường (Cần GROQ_API_KEY và SUPABASE_KEY).' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const lowerMsg = message.toLowerCase();
    const unaccentedMsg = removeAccents(lowerMsg);
    
    // ĐỊNH TUYẾN Ý ĐỊNH
    const isEventQuery = /(su kien|gio|hop|le|ngay|ky niem|sap toi)/.test(unaccentedMsg);
    const isFinanceQuery = /(quy|tien|dong gop|ung ho|chi tieu|thu chi)/.test(unaccentedMsg);
    const isCountQuery = /(bao nhieu|tong so)/.test(unaccentedMsg);

    let cleanMsg = unaccentedMsg.replace(/(thong tin|cho biet|hoi ve|ai la|tim|ve|cua|nhung|nguoi|ten|cha|me|vo|chong|con|cai|gia|pha|ban|su kien|gio|hop|ngay|ong|ba|anh|chi|em|bac|chu|co|di|cau|mo|thim)/g, ' ').trim();
    const keywords = cleanMsg.split(/[ \n\t.,?]+/).filter((w: string) => w.length > 1);

    let systemContext = "";
    
    if (isEventQuery) {
      const { data: events } = await supabase.from('custom_events').select('*').limit(20);
      if (events && events.length > 0) {
        systemContext += `\nDỮ LIỆU SỰ KIỆN (CSV):\n${jsonToCsv(events)}\n`;
      }
    } 
    else if (isFinanceQuery) {
      systemContext += `\nHệ thống hiện tại chưa kết nối bảng tài chính. Hãy báo người dùng "Tính năng đang được phát triển".\n`;
    }
    else {
      // Ép về lấy 1500 dòng để DB xử lý nhanh và nhẹ
      const { data: allPersons, count } = await supabase.from('persons').select('*', { count: 'exact' }).limit(1500);
      const totalMembers = count || (allPersons ? allPersons.length : 0);
      systemContext += `\n- Tổng số thành viên gia phả: ${totalMembers} người.\n`;

      let finalPersons: any[] = [];
      let relationshipsData: any[] = [];

      if (allPersons && allPersons.length > 0) {
        let mainPersons = allPersons;

        if (keywords.length > 0 && !isCountQuery) {
          const scoredPersons = allPersons.map((p: any) => {
            const nameStr = removeAccents((p.full_name || p.name || '').toLowerCase());
            let score = 0;
            keywords.forEach((kw: string) => { if (nameStr.includes(kw)) score += 1; });
            return { ...p, _matchScore: score };
          });

          // Lấy 15 người điểm cao nhất để an toàn cho giới hạn Token của Groq
          mainPersons = scoredPersons.filter((p: any) => p._matchScore > 0).sort((a: any, b: any) => b._matchScore - a._matchScore).slice(0, 15); 
        } else {
          mainPersons = mainPersons.slice(0, 15);
        }

        finalPersons = [...mainPersons];

        if (mainPersons.length > 0) {
          const mainIds = mainPersons.map(p => p.id).filter(Boolean);
          if (mainIds.length > 0) {
            const { data: rels } = await supabase
              .from('relationships')
              .select('*')
              .or(`person_id.in.(${mainIds.join(',')}),related_person_id.in.(${mainIds.join(',')})`)
              .limit(100); // Lấy 100 mối quan hệ để nhét vừa Context của Groq

            if (rels && rels.length > 0) {
              relationshipsData = rels;
              const relativeIds = new Set<string>();
              rels.forEach(r => {
                if (r.person_id && !mainIds.includes(r.person_id)) relativeIds.add(r.person_id);
                if (r.related_person_id && !mainIds.includes(r.related_person_id)) relativeIds.add(r.related_person_id);
              });

              const relIdsArray = Array.from(relativeIds);
              if (relIdsArray.length > 0) {
                const foundRelatives = allPersons.filter(p => relIdsArray.includes(p.id));
                finalPersons = [...finalPersons, ...foundRelatives];
              }
            }
          }
        }
      }

      const uniquePersons = Array.from(new Map(finalPersons.map(p => [p.id, p])).values());
      const cleanPersons = uniquePersons.map((p: any) => {
        const clean: any = { id: p.id };
        for (const key in p) {
          const lowerKey = key.toLowerCase();
          if (['created_at', 'updated_at', 'avatar_url', 'image', 'photo', 'uuid', '_matchscore'].includes(lowerKey)) continue;
          if (p[key] !== null && p[key] !== '') clean[key] = p[key];
        }
        return clean;
      });

      const translatedRelationships = relationshipsData.map((r: any) => {
        const p1 = uniquePersons.find(p => p.id === r.person_id);
        const p2 = uniquePersons.find(p => p.id === r.related_person_id);
        if (p1 && p2) {
          const name1 = p1.full_name || p1.name || 'Không rõ';
          const name2 = p2.full_name || p2.name || 'Không rõ';
          return `- ${name1} (ID: ${p1.id}) có quan hệ là "${r.relationship_type || r.type}" với ${name2} (ID: ${p2.id})`;
        }
        return null;
      }).filter(Boolean);

      systemContext += `\nDỮ LIỆU THÀNH VIÊN (CSV):\n${jsonToCsv(cleanPersons)}\n`;
      if (translatedRelationships.length > 0) {
         systemContext += `\nDỮ LIỆU QUAN HỆ:\n${translatedRelationships.join('\n')}\n`;
      }
    }

    const systemPrompt = `Bạn là Trợ lý Gia Phả dòng họ Nguyễn Thiệu. Nguyên tắc: CHÍNH XÁC, không bịa đặt.
Nếu không có thông tin, hãy trả lời: "Không đủ thông tin để kết luận".
${systemContext}
HƯỚNG DẪN TRÌNH BÀY:
1. NẾU HỎI VỀ SỰ KIỆN: Liệt kê rõ ràng ngày, tên sự kiện, địa điểm.
2. NẾU HỎI VỀ GIA ĐÌNH: BẮT BUỘC liệt kê bằng gạch đầu dòng (KHÔNG DÙNG BẢNG). Chỉ hiển thị Bố, Mẹ, Vợ, Chồng, Con, Anh/Chị/Em ruột. Tuyệt đối loại bỏ họ hàng xa. Không hiển thị số ID.
3. CHÈN LIÊN KẾT HỒ SƠ: Khi bạn cung cấp thông tin về một cá nhân cụ thể, hãy kiểm tra cột "id" của người đó trong dữ liệu CSV và bắt buộc nối thêm một đường dẫn Markdown ở cuối cùng của câu trả lời theo đúng định dạng sau:
[Nhấn vào đây để xem chi tiết tiểu sử của {Tên thành viên}](/dashboard/members?memberModalId={id})
Lưu ý: Thay thế {Tên thành viên} bằng họ tên đầy đủ và {id} bằng chuỗi ID chính xác của người đó.`;

    // Gọi lại API của Groq (LLaMA 3.1)
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
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Lỗi kết nối Groq API');
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ reply });
    
  } catch (error: any) {
    return NextResponse.json({ reply: `Hệ thống gián đoạn: ${error.message}` }, { status: 500 });
  }
}

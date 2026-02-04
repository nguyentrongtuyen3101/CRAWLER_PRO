import { GEMINI_CONFIG } from '../config/gemini.config.js';

import { sleep } from './helpers.js';

export async function callGeminiAPI(prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `${GEMINI_CONFIG.apiUrl}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      });

      const textRaw = await response.text();
      
      if (!textRaw) {
        console.error('  [ERROR] Gemini response body rỗng');
        throw new Error('Empty response');
      }

      let data = JSON.parse(textRaw);

      // Check for rate limit error (429)
      if (data.error?.code === 429) {
        const waitTime = (attempt + 1) * 5; // 15s, 30s, 45s
        console.log(`  ⚠️ Gemini rate limit, đợi ${waitTime}s... (attempt ${attempt + 1}/${retries})`);
        await sleep(waitTime * 1000);
        continue; // Retry
      }

      // Check for other errors
      if (data.error) {
        console.error(`  [ERROR] Gemini error: ${data.error.message}`);
        throw new Error(data.error.message);
      }

      console.log('  [DEBUG] Gemini response:', JSON.stringify(data).substring(0, 200));

      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch (error) {
      console.error(`  ✗ Lỗi gọi Gemini (attempt ${attempt + 1}/${retries}): ${error.message}`);
      
      if (attempt < retries - 1) {
        await sleep(2000); // Wait 5s before retry
      }
    }
  }
  
  console.error('  ✗ Gemini failed sau tất cả retries');
  return null; // All retries failed
}

export function extractSkillsPrompt(description, requirements) {
  return `Phân tích đoạn mô tả công việc và yêu cầu sau đây, trích xuất các kỹ năng (skills) dưới dạng keywords ngắn gọn.

Mô tả công việc:
${description}

Yêu cầu công việc:
${requirements.join('\n')}

Hãy trả về CHÍNH XÁC theo format JSON sau, không thêm bất kỳ text nào khác:
{
  "skills": ["skill1", "skill2", "skill3"]
}

Lưu ý: liệt kê kỹ năng dạng keywords chứ không dài dòng.`;
}

export async function extractSkillsWithGemini(description, requirements) {
  try {
    console.log('  → Đang phân tích skills bằng Gemini...');
    
    // Thêm delay ngay từ đầu để tránh rate limit
    await sleep(3000); // Đợi 3s trước khi gọi
    
    const prompt = extractSkillsPrompt(description, requirements);
    const text = await callGeminiAPI(prompt); // Đã có retry logic bên trong
    
    console.log('  [DEBUG] Raw text from Gemini:', text ? text.substring(0, 200) : 'null');
    
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('  [DEBUG] JSON matched:', jsonMatch[0].substring(0, 100));
        const result = JSON.parse(jsonMatch[0]);
        console.log(`  ✓ Đã phân tích được ${result.skills.length} skills:`, result.skills);
        return result.skills;
      } else {
        console.log('  ✗ Không tìm thấy JSON trong response');
      }
    } else {
      console.log('  ✗ Gemini không trả về text');
    }
    
    return [];
  } catch (error) {
    console.log(`  ✗ Lỗi phân tích Gemini: ${error.message}`);
    return [];
  }
}
// Thêm vào file geminiHelper.js

/**
 * Tóm tắt và dịch description sang tiếng Anh
 */
export function summarizeDescriptionPrompt(description) {
  return `Phân tích đoạn mô tả công việc sau, tóm tắt nội dung chính quan trọng nhất thành 1 câu ngắn gọn (tối đa 100 ký tự), sau đó dịch sang tiếng Anh.

Mô tả công việc:
${description}

Hãy trả về CHÍNH XÁC theo format JSON sau, không thêm bất kỳ text nào khác:
{
  "summary": "Câu tóm tắt ngắn gọn bằng tiếng Anh (max 100 chars)"
}

Lưu ý: 
- Chỉ giữ lại thông tin quan trọng nhất
- Dùng tiếng Anh chuẩn
- Không quá 100 ký tự
- nếu dữ liệu truyền vào là tiếng anh thì chỉ cần tóm tắt, không cần dịch`;
}

/**
 * Tóm tắt và dịch skills sang tiếng Anh
 */
export function summarizeSkillsPrompt(skills) {
  return `Phân tích danh sách kỹ năng sau, chọn ra 5-7 kỹ năng quan trọng nhất, tóm tắt thành cụm từ ngắn gọn và dịch sang tiếng Anh.

Danh sách kỹ năng:
${skills.join(', ')}

Hãy trả về CHÍNH XÁC theo format JSON sau, không thêm bất kỳ text nào khác:
{
  "summary": "Top skills ngắn gọn bằng tiếng Anh, cách nhau bởi dấu phẩy (max 100 chars)"
}

Lưu ý:
- Chỉ liệt kê 5-7 kỹ năng quan trọng nhất
- Dùng từ ngắn gọn: "React, Node.js, MongoDB" thay vì câu dài
- Không quá 100 ký tự
-nếu dữ liệu truyền vào là tiếng anh thì chỉ cần tóm tắt, không cần dịch`;
}

/**
 * Tóm tắt và dịch requirements sang tiếng Anh
 */
export function summarizeRequirementsPrompt(requirements) {
  return `Phân tích danh sách yêu cầu công việc sau, tóm tắt các yêu cầu chính quan trọng nhất thành 1 câu ngắn gọn (tối đa 100 ký tự), sau đó dịch sang tiếng Anh.

Yêu cầu công việc:
${requirements.join('\n')}

Hãy trả về CHÍNH XÁC theo format JSON sau, không thêm bất kỳ text nào khác:
{
  "summary": "Tóm tắt yêu cầu chính bằng tiếng Anh (max 100 chars)"
}

Lưu ý:
- Chỉ giữ lại yêu cầu quan trọng nhất (kinh nghiệm, trình độ, kỹ năng cốt lõi)
- Dùng tiếng Anh chuẩn
- Không quá 100 ký tự
-nếu dữ liệu truyền vào là tiếng anh thì chỉ cần tóm tắt, không cần dịch`;
}

/**
 * Helper function tổng hợp: Summarize và dịch description
 */
export async function summarizeAndTranslateDescription(description) {
  if (!description || description.trim().length === 0) return null;
  
  try {
    console.log('  → Đang tóm tắt description...');
    const prompt = summarizeDescriptionPrompt(description);
    const text = await callGeminiAPI(prompt);
    
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log(`  ✓ Description summary: ${result.summary}`);
        return result.summary;
      }
    }
    return null;
  } catch (error) {
    console.log(`  ✗ Lỗi tóm tắt description: ${error.message}`);
    return null;
  }
}

/**
 * Helper function tổng hợp: Summarize và dịch skills
 */
export async function summarizeAndTranslateSkills(skills) {
  if (!skills || skills.length === 0) return null;
  
  try {
    console.log('  → Đang tóm tắt skills...');
    const prompt = summarizeSkillsPrompt(skills);
    const text = await callGeminiAPI(prompt);
    
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log(`  ✓ Skills summary: ${result.summary}`);
        return result.summary;
      }
    }
    return null;
  } catch (error) {
    console.log(`  ✗ Lỗi tóm tắt skills: ${error.message}`);
    return null;
  }
}

/**
 * Helper function tổng hợp: Summarize và dịch requirements
 */
export async function summarizeAndTranslateRequirements(requirements) {
  if (!requirements || requirements.length === 0) return null;
  
  try {
    console.log('  → Đang tóm tắt requirements...');
    const prompt = summarizeRequirementsPrompt(requirements);
    const text = await callGeminiAPI(prompt);
    
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log(`  ✓ Requirements summary: ${result.summary}`);
        return result.summary;
      }
    }
    return null;
  } catch (error) {
    console.log(`  ✗ Lỗi tóm tắt requirements: ${error.message}`);
    return null;
  }
}

/**
 * Helper function tổng hợp: Process tất cả summaries cùng lúc
 */
export async function processJobSummaries(description, skills, requirements) {
  console.log('  → Bắt đầu tạo summaries...');
  
  const [descSum, skillsSum, reqSum] = await Promise.all([
    summarizeAndTranslateDescription(description),
    summarizeAndTranslateSkills(skills),
    summarizeAndTranslateRequirements(requirements)
  ]);
  
  return {
    descriptionSum: descSum,
    skillsSum: skillsSum,
    requirementsSum: reqSum
  };
}
// src/utils/translator.js
import { sleep } from './helpers.js';

/**
 * Dịch sử dụng Google Translate unofficial API (Free, no key needed)
 * @param {string} text - Text cần dịch
 * @returns {Promise<string>} - Text đã dịch
 */
async function translateWithGoogle(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // ✅ FIX: Lấy tất cả các phần dịch, không chỉ phần đầu
  if (data && data[0]) {
    return data[0]
      .map(item => item[0])
      .filter(Boolean)
      .join(' ');
  }
  
  return text;
}

/**
 * Dịch sử dụng MyMemory API (Free, no key needed, backup)
 * @param {string} text - Text cần dịch
 * @returns {Promise<string>} - Text đã dịch
 */
async function translateWithMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|en`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.responseData.translatedText;
}

/**
 * Dịch text từ Tiếng Việt sang Tiếng Anh
 * Thử Google Translate trước, fallback sang MyMemory nếu fail
 * @param {string} text - Text cần dịch
 * @param {number} retries - Số lần retry nếu fail (default: 2)
 * @returns {Promise<string>} - Text đã dịch hoặc text gốc nếu fail
 */
export async function translateViToEn(text, retries = 2) {
  if (!text || text.trim() === '') {
    return text;
  }

  // Try Google Translate first
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const translated = await translateWithGoogle(text);
      console.log(`  ✓ Dịch (Google): "${text.substring(0, 40)}..." → "${translated.substring(0, 40)}..."`);
      return translated;
    } catch (error) {
      console.log(`  ⚠️ Google fail (attempt ${attempt + 1}/${retries}): ${error.message}`);
      if (attempt < retries - 1) {
        await sleep(1000);
      }
    }
  }

  // Fallback to MyMemory
  try {
    const translated = await translateWithMyMemory(text);
    console.log(`  ✓ Dịch (MyMemory): "${text.substring(0, 40)}..." → "${translated.substring(0, 40)}..."`);
    return translated;
  } catch (error) {
    console.log(`  ✗ MyMemory fail: ${error.message}`);
  }

  // All failed, return original
  console.log(`  → Giữ nguyên text gốc: "${text.substring(0, 40)}..."`);
  return text;
}

/**
 * Dịch một array các string
 * @param {string[]} texts - Array text cần dịch
 * @param {number} delayMs - Delay giữa mỗi request (default: 3000ms để tránh rate limit)
 * @returns {Promise<string[]>} - Array text đã dịch
 */
export async function translateArray(texts, delayMs = 3000) {
  const results = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const translated = await translateViToEn(text);
    results.push(translated);

    // Sleep giữa các requests để tránh rate limit (trừ request cuối)
    if (i < texts.length - 1) {
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * Dịch các field của một object
 * @param {Object} obj - Object chứa data cần dịch
 * @param {string[]} fields - Array tên các field cần dịch
 * @param {number} delayMs - Delay giữa mỗi field
 * @returns {Promise<Object>} - Object với các field đã dịch
 */
export async function translateObjectFields(obj, fields, delayMs = 3000) {
  const result = { ...obj };

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    if (obj[field]) {
      // Nếu là array, dịch từng item
      if (Array.isArray(obj[field])) {
        result[field] = await translateArray(obj[field], delayMs);
      } 
      // Nếu là string, dịch trực tiếp
      else if (typeof obj[field] === 'string') {
        result[field] = await translateViToEn(obj[field]);
      }

      // Sleep giữa các fields (trừ field cuối)
      if (i < fields.length - 1) {
        await sleep(delayMs);
      }
    }
  }

  return result;
}

/**
 * Dịch nhanh - dùng cho batch processing
 * @param {string} text - Text cần dịch
 * @returns {Promise<string>} - Text đã dịch hoặc text gốc
 */
export async function translateQuick(text) {
  if (!text || text.trim() === '') {
    return text;
  }

  const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
  console.log(`  → Đang dịch: "${preview}"`);

  // Try Google first
  try {
    const translated = await translateWithGoogle(text);
    const translatedPreview = translated.length > 50 ? translated.substring(0, 50) + '...' : translated;
    console.log(`  ✓ Dịch thành công: "${translatedPreview}"`);
    return translated;
  } catch (error) {
    console.log(`  ⚠️ Google fail, trying MyMemory...`);
  }

  // Try MyMemory backup
  try {
    const translated = await translateWithMyMemory(text);
    const translatedPreview = translated.length > 50 ? translated.substring(0, 50) + '...' : translated;
    console.log(`  ✓ Dịch thành công (MyMemory): "${translatedPreview}"`);
    return translated;
  } catch (error) {
    console.log(`  ✗ Tất cả fail, giữ nguyên text gốc`);
  }

  return text;
}

/**
 * ✅ NEW: Dịch array nhanh - dùng cho crawl real-time
 * Delay ngắn hơn translateArray để crawl nhanh hơn
 * @param {string[]} items - Array text cần dịch
 * @param {number} delayMs - Delay giữa mỗi request (default: 500ms)
 * @returns {Promise<string[]>} - Array text đã dịch
 */
export async function translateArrayQuick(items, delayMs = 500) {
  if (!items || items.length === 0) {
    return [];
  }

  console.log(`  → Đang dịch array gồm ${items.length} items...`);
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const translated = await translateQuick(item);
    results.push(translated);

    // Sleep giữa các requests để tránh rate limit (trừ request cuối)
    if (i < items.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`  ✓ Hoàn thành dịch ${results.length} items`);
  return results;
}
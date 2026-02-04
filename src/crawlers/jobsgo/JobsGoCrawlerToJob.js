// src/crawlers/JobsGoCrawlerToJob.js
import BaseCrawler from '../BaseCrawler.js';
import { sleep, toSlug, generateId } from '../../utils/helpers.js';
import { translateQuick,translateArrayQuick } from '../../utils/translator.js';
import { extractSkillsWithGemini, processJobSummaries } from '../../utils/geminiHelper.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { CrawlerService } from '../../services/crawler.service.js';
import { extractSkillsQuick } from '../../utils/hybridSkillExtractor.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

class JobsGoCrawlerToJob extends BaseCrawler {
  constructor() {
    super();
    this.domain = 'https://jobsgo.vn';
    this.crawlerService = new CrawlerService();
  }

  parseBudget(budgetText) {
    if (!budgetText) return { budget: null, min: null, max: null };

    const text = budgetText.trim();

    // Case: "Đến 30 triệu VNĐ" -> 30000000
    const toMatch = text.match(/Đến\s+(\d+)\s+triệu/i);
    if (toMatch) {
      const value = parseInt(toMatch[1]) * 1000000;
      return { budget: value.toString(), min: value.toString(), max: value.toString() };
    }

    // Case: "Từ 1 triệu VNĐ" -> 1000000
    const fromMatch = text.match(/Từ\s+(\d+)\s+triệu/i);
    if (fromMatch) {
      const value = parseInt(fromMatch[1]) * 1000000;
      return { budget: value.toString(), min: value.toString(), max: value.toString() };
    }

    // Case: "1 - 3 triệu VNĐ" -> 1000000-3000000
    const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)\s+triệu/i);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1]) * 1000000;
      const max = parseInt(rangeMatch[2]) * 1000000;
      return {
        budget: `${min}-${max}`,
        min: min.toString(),
        max: max.toString()
      };
    }

    // Nếu là text thuần không parse được
    return { budget: text, min: text, max: text };
  }

  parseDeadline(deadlineText) {
    if (!deadlineText) return null;

    // Ví dụ: "21/01/2026 (Còn 13 ngày)"
    const match = deadlineText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }

    return null;
  }

  parseDate(dateText) {
    if (!dateText) return null;

    const match = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }

    return null;
  }

  async crawlJobDetail(jobUrl, companyId) {
    try {

      console.log(`  → Truy cập job: ${jobUrl}`);
      await this.page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2000);

      const jobData = await this.page.evaluate(() => {
        const data = {};

        // Title
        const titleEl = document.querySelector('h1.job-title.mb-2.mb-sm-3.fs-4');
        data.title = titleEl ? titleEl.textContent.trim() : null;

        // Location
        const locationDiv = document.querySelector('div.location-extra.mt-2');
        const italicDiv = document.querySelector('div[style*="italic"]');
        data.location = [];

        if (locationDiv) {
          const spans = locationDiv.querySelectorAll('span');
          spans.forEach(s => {
            const text = s.textContent.trim();
            if (text) data.location.push(text);
          });
        }

        if (italicDiv) {
          const spans = italicDiv.querySelectorAll('span');
          spans.forEach(s => {
            const text = s.textContent.trim();
            if (text) data.location.push(text);
          });
        }

        data.location = data.location.join(', ');

        // Job Type
        data.jobType = null;
        const jobTypeLabel = Array.from(document.querySelectorAll('span.text-muted.flex-grow-1'))
          .find(el => el.textContent.includes('Loại hình:'));
        if (jobTypeLabel) {
          const strongEl = jobTypeLabel.nextElementSibling;
          if (strongEl && strongEl.tagName === 'STRONG') {
            data.jobType = strongEl.textContent.trim();
          }
        }

        // Description
        data.description = null;
        const descTitle = Array.from(document.querySelectorAll('h3.section-title'))
          .find(el => el.textContent.includes('Mô tả công việc:'));
        if (descTitle) {
          const descDiv = descTitle.nextElementSibling;
          if (descDiv) {
            const allTexts = [];
            const walker = document.createTreeWalker(descDiv, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent.trim();
              if (text) allTexts.push(text);
            }
            data.description = allTexts.join(' ');
          }
        }

        // Budget
        data.budgetText = null;
        const salaryLabel = Array.from(document.querySelectorAll('span.text-muted'))
          .find(el => el.textContent.includes('Mức lương:'));
        if (salaryLabel) {
          const salarySpan = salaryLabel.nextElementSibling;
          if (salarySpan && salarySpan.classList.contains('d-block')) {
            data.budgetText = salarySpan.textContent.trim();
          }
        }

        // Skills
        data.skills = [];
        const skillsLabel = Array.from(document.querySelectorAll('div.text-muted'))
          .find(el => el.textContent.includes('Kỹ năng:'));
        if (skillsLabel) {
          const strongEl = skillsLabel.nextElementSibling;
          if (strongEl && strongEl.tagName === 'STRONG') {
            const skillSpans = strongEl.querySelectorAll('span');
            skillSpans.forEach(span => {
              const skill = span.textContent.trim();
              if (skill) data.skills.push(skill);
            });
          }
        }

        // Requirements
        data.requirements = [];
        const reqTitle = Array.from(document.querySelectorAll('h3.section-title'))
          .find(el => el.textContent.includes('Yêu cầu công việc:'));
        if (reqTitle) {
          const reqDiv = reqTitle.nextElementSibling;
          if (reqDiv) {
            // Lấy tất cả text từ các thẻ con trong div
            const allTexts = [];
            const walker = document.createTreeWalker(reqDiv, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent.trim();
              if (text && text.length > 2) {
                allTexts.push(text);
              }
            }
            data.requirements = allTexts;
          }
        }

        // Application Deadline
        data.deadline = null;
        const deadlineEl = document.querySelector('strong.d-inline-block');
        if (deadlineEl) {
          data.deadline = deadlineEl.textContent.trim();
        }

        // Posted Date
        data.postedDate = null;
        const postedLabel = Array.from(document.querySelectorAll('span.text-muted.flex-grow-1'))
          .find(el => el.textContent.includes('Ngày đăng tuyển:'));
        if (postedLabel) {
          const strongEl = postedLabel.nextElementSibling;
          if (strongEl && strongEl.tagName === 'STRONG') {
            data.postedDate = strongEl.textContent.trim();
          }
        }

        return data;
      });
      if (jobData.skills.length === 0 && (jobData.description || jobData.requirements.length > 0)) {
        console.log('  → Phân tích skills bằng Hybrid method...');
        jobData.skills = extractSkillsQuick(
          jobData.description || '',
          jobData.requirements
        );
      }

      // Parse budget
      const budgetInfo = this.parseBudget(jobData.budgetText);
      const slug = toSlug(jobData.title);
      // ✅ Dịch các field đơn
      const titleSum = await translateQuick(jobData.title);
      const locationSum = await translateQuick(jobData.location || '');
      const descriptionSum = jobData.description 
        ? await translateQuick(jobData.description)
        : null;
      
      // ✅ FIX: Dịch skills array bằng translateArrayQuick
      let skillsSum = null;
      if (jobData.skills.length > 0) {
        const translatedSkills = await translateArrayQuick(jobData.skills, 500);
        skillsSum = translatedSkills.join(', ');
      }
      
      // ✅ FIX: Dịch requirements array bằng translateArrayQuick
      let requirementsSum = null;
      if (jobData.requirements.length > 0) {
        const translatedReqs = await translateArrayQuick(jobData.requirements, 500);
        requirementsSum = translatedReqs.join('. ');
      }
      // Create job object
      const job = {
        id: generateId(),
        companyId: companyId,
        ownerId: 'hr',
        title: jobData.title,
        slug: slug,
        location: jobData.location || null,
        workArrangement: 'onsite',
        jobType: jobData.jobType || null,
        description: jobData.description,
        budget: budgetInfo.budget,
        budgetMin: budgetInfo.min,
        budgetMax: budgetInfo.max,
        skills: jobData.skills,
        requirements: jobData.requirements,
        status: 'open',
        jobUrl: jobUrl,
        applicationDeadline: this.parseDeadline(jobData.deadline),
        descriptionRaw: jobData.description,
        postedDate: this.parseDate(jobData.postedDate),
        //sum
        titleSum: titleSum,
        locationSum: locationSum,
        descriptionSum: descriptionSum,
        skillsSum: skillsSum,
        requirementsSum: requirementsSum,

        searchableText: null,
        lastEmbeddingUpdate: new Date().toISOString(),
        source: 'jobsgo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return job;
    } catch (error) {
      console.error(`  ✗ Lỗi crawl job: ${error.message}`);
      return null;
    }
  }

  async crawlCompanyJobs(companyUrl, companyId) {
    try {
      console.log(`\n📄 Đang crawl jobs từ: ${companyUrl}`);
      await this.page.goto(companyUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2000);

      // Lấy danh sách job URLs
      const jobUrls = await this.page.evaluate(() => {
        const urls = [];
        const links = document.querySelectorAll('a.text-decoration-none.text-dark.d-block.h-100');

        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href) urls.push(href);
        });

        return urls;
      });

      if (jobUrls.length === 0) {
        console.log('  ✗ Không tìm thấy job nào');
        return;
      }

      console.log(`  ✓ Tìm thấy ${jobUrls.length} jobs`);

      // Crawl từng job
      for (let i = 0; i < jobUrls.length; i++) {
        const jobUrl = jobUrls[i].startsWith('http')
          ? jobUrls[i]
          : this.domain + jobUrls[i];

        console.log(`\n  [${i + 1}/${jobUrls.length}]`);

        const job = await this.crawlJobDetail(jobUrl, companyId);

        if (job) {
          const saved = await this.crawlerService.saveJob(job);
          if (saved) {
            console.log(`  ✓ Đã lưu job: ${job.jobUrl}`);
          } else {
            console.log(`  ↪ Job đã tồn tại, bỏ qua: ${job.jobUrl}`);
          }
          await sleep(2000);
        }
      }
    } catch (error) {
      console.error(`✗ Lỗi crawl company jobs: ${error.message}`);
    }
  }

  async crawlAll() {
  // Load companyUrl -> companyId từ DB
  await this.crawlerService.loadExistingCompanyUrls();

  const companyEntries = Array.from(
    this.crawlerService.companyUrlToIdMap.entries()
  );

  if (companyEntries.length === 0) {
    console.log('✗ Không có công ty nào trong DB');
    return;
  }

  console.log(
    `\n🚀 Bắt đầu crawl jobs cho ${companyEntries.length} công ty\n`
  );

  for (let i = 0; i < companyEntries.length; i++) {
    const [companyUrl, companyId] = companyEntries[i];

    console.log(`\n[${i + 1}/${companyEntries.length}] ${companyUrl}`);

    await this.crawlCompanyJobs(companyUrl, companyId);

    await sleep(3000);
  }

  console.log('\n✅ Hoàn thành crawl jobs');
}

}

export default JobsGoCrawlerToJob;
// src/crawlers/JobsGoCrawler.js
import BaseCrawler from '../BaseCrawler.js';
import { sleep, toSlug, generateId } from '../../utils/helpers.js';
import { translateQuick } from '../../utils/translator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { CrawlerService } from '../../services/crawler.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class JobsGoCrawler extends BaseCrawler {
  constructor() {
    super();
    this.domain = 'https://jobsgo.vn';
    this.baseUrl = 'https://jobsgo.vn/cong-ty-cong-nghe';
    this.existingCompanyNames = new Set();
    this.existingCompanyUrls = new Set();
    this.crawlerService = new CrawlerService();
  }
  async getTaxCode(companyName) {
    try {
      console.log(`  → Đang tìm mã số thuế cho: ${companyName}`);

      const taxPage = await this.browser.newPage();

      // Truy cập trang tra cứu
      await taxPage.goto('https://thuvienphapluat.vn/ma-so-thue/tra-cuu-ma-so-thue-doanh-nghiep?tukhoa=&timtheo=ten-doanh-nghiep', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      await sleep(2000);

      // Nhập tên công ty vào ô search
      await taxPage.waitForSelector('input.seach-basic', { timeout: 10000 });
      await taxPage.type('input.seach-basic', companyName);
      await sleep(500);

      // Click button search
      await taxPage.click('button.btn-search[type="submit"]');
      await sleep(5000); // Đợi kết quả load

      // Lấy mã số thuế từ attribute title
      const taxCode = await taxPage.evaluate(() => {
        const link = document.querySelector('a[title*="Mã số thuế"]');
        if (link) {
          const title = link.getAttribute('title');
          // Extract số từ "Mã số thuế 0315807446"
          const match = title.match(/Mã số thuế\s+(\d+)/i);
          return match ? match[1] : null;
        }
        return null;
      });

      await taxPage.close();

      if (taxCode) {
        console.log(`  ✓ Mã số thuế: ${taxCode}`);
      } else {
        console.log(`  ✗ Không tìm thấy mã số thuế`);
      }

      return taxCode;
    } catch (error) {
      console.log(`  ✗ Lỗi lấy mã số thuế: ${error.message}`);
      return null;
    }
  }
  async crawlCompanyDetail(companyUrl, name) {
    try {
      console.log(`  → Truy cập: ${companyUrl}`);
      await this.page.goto(companyUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2000);

      const companyData = await this.page.evaluate(() => {

        const data = {};
        // Name
        const nameEl = document.querySelector(
          'h1.fw-bolder.text-dark.fs-3.mb-2.w-100'
        );
        data.name = nameEl ? nameEl.textContent.trim() : null;

        // Description
        const descEl = document.querySelector('div.description-content');
        if (!descEl) {
          // Thử selector khác
          const altDesc = document.querySelector('[class*="description"]');
          data.description = altDesc ? altDesc.textContent.trim() : null;
        } else {
          data.description = descEl.textContent.trim();
        }

        // Website - tìm link có target="_blank" và rel="nofollow"
        const links = document.querySelectorAll('a[target="_blank"][rel="nofollow"]');
        data.website = null;
        for (const link of links) {
          const href = link.href;
          // Lọc bỏ social links
          if (href && !href.includes('facebook') && !href.includes('linkedin') &&
            !href.includes('twitter') && !href.includes('instagram')) {
            data.website = href;
            break;
          }
        }

        // Logo
        const logoImg = document.querySelector('img[class*="logo"]');
        data.logo = logoImg ? logoImg.src : null;

        // Industry - chỉ lấy các span có đúng class text-capitalize text-primary fw-bold
        const industryEls = document.querySelectorAll('span.text-capitalize.text-primary.fw-bold');
        data.industry = [];
        for (const el of industryEls) {
          const text = el.textContent.trim();
          if (text && text.length > 2 && text.length < 50) {
            data.industry.push(text);
          }
        }
        data.industry = [...new Set(data.industry)]; // Remove duplicates

        // Size - tìm text có pattern "X-Y cán bộ/nhân viên"
        const bodyText = document.body.textContent;
        const sizeMatch = bodyText.match(/(\d+\s*-\s*\d+|>\s*\d+|<\s*\d+)\s*cán bộ\/nhân viên/i);
        data.size = sizeMatch ? sizeMatch[0] : null;

        // Location - tìm địa chỉ
        data.location = [];
        const locationSelectors = [
          'li.d-flex.align-items-start.gap-2',
          '[class*="location"]',
          '[class*="address"]'
        ];

        for (const selector of locationSelectors) {
          const locationEls = document.querySelectorAll(selector);
          for (const el of locationEls) {
            const text = el.textContent.trim();
            if (text && (text.includes('Hà Nội') || text.includes('Hồ Chí Minh') ||
              text.includes('Đà Nẵng') || text.includes('Phường') ||
              text.includes('Quận') || text.includes('Tỉnh'))) {
              data.location.push(text);
            }
          }
          if (data.location.length > 0) break;
        }

        // Founded Year
        data.foundedYear = null;
        const yearMatch = bodyText.match(/thành lập\s+năm\s+(\d{4})|năm\s+(\d{4})/i);
        if (yearMatch) {
          data.foundedYear = parseInt(yearMatch[1] || yearMatch[2]);
        }

        // Social links
        data.linkedin = null;
        data.facebook = null;

        // Tìm LinkedIn - thẻ a có target="_blank" rel="nofollow" và chứa i.icon-linkedin
        const linkedinLinks = document.querySelectorAll('a[target="_blank"][rel="nofollow"]');
        for (const link of linkedinLinks) {
          const icon = link.querySelector('i.icon-linkedin, i[class*="linkedin"]');
          if (icon) {
            data.linkedin = link.href;
            break;
          }
        }

        // Tìm Facebook - thẻ a có target="_blank" rel="nofollow" và chứa i.icon-facebook
        const facebookLinks = document.querySelectorAll('a[target="_blank"][rel="nofollow"]');
        for (const link of facebookLinks) {
          const icon = link.querySelector('i.icon-facebook, i[class*="facebook"]');
          if (icon) {
            data.facebook = link.href;
            break;
          }
        }

        return data;
      });
      const realName = companyData.name || name || null;

      // Lấy mã số thuế
      const taxCode = await this.getTaxCode(realName);
      const companyId = generateId();
      const slug = toSlug(realName);
      const nameSum = await translateQuick(realName);
      // Tạo object company
      const company = {
        id: companyId,
        name: realName,
        slug: slug,
        username: companyId,
        description: companyData.description,
        website: companyData.website,
        companyUrl: [companyUrl],
        logo: companyData.logo,
        industry: companyData.industry,
        size: companyData.size,
        location: companyData.location,
        foundedYear: companyData.foundedYear,
        isActive: true,
        taxCode: taxCode,
        email: null,
        phone: null,
        address: companyData.location.length > 0 ? companyData.location[0] : null,
        linkedin: companyData.linkedin,
        facebook: companyData.facebook,
        twitter: null,
        settings: null,
        features: null,
        nameSum: nameSum,
        lastEmbeddingUpdate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return company;
    } catch (error) {
      console.error(`  ✗ Lỗi crawl chi tiết: ${error.message}`);
      return null;
    }
  }


 async crawlPage(pageNumber = 1) {
    try {
      const url = pageNumber === 1
        ? `${this.baseUrl}.html`
        : `${this.baseUrl}-trang-${pageNumber}.html`;

      console.log(`\n📄 Đang crawl trang ${pageNumber}: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2000);

      const companies = await this.page.evaluate((domain) => {
        const urls = new Set();
        const links = document.querySelectorAll('a[href*="/tuyen-dung/"]');

        for (const link of links) {
          const href = link.getAttribute('href');
          if (!href || !href.endsWith('.html')) continue;

          const fullUrl = href.startsWith('http') ? href : domain + href;
          urls.add(fullUrl);
        }

        return Array.from(urls).map(u => ({ companyUrl: u }));
      }, this.domain);

      if (companies.length === 0) {
        console.log(`✗ Không tìm thấy công ty nào`);
        return false;
      }

      console.log(`✓ Tìm thấy ${companies.length} công ty`);

      for (let i = 0; i < companies.length; i++) {
        const { companyUrl } = companies[i];

        // ✅ CHECK TRƯỚC KHI CRAWL
        if (this.existingCompanyUrls.has(companyUrl)) {
          console.log(`  ↪ Bỏ qua (đã có trong DB): ${companyUrl}`);
          continue;
        }

        const company = await this.crawlCompanyDetail(companyUrl);

        if (company) {
          await this.crawlerService.saveCompany(company);
          this.existingCompanyUrls.add(companyUrl);
          this.companyUrlToIdMap.set(companyUrl, company.id);
          await sleep(2000);
        }
      }

      return true;
    } catch (error) {
      console.error(`✗ Lỗi crawl trang ${pageNumber}: ${error.message}`);
      return false;
    }
  }

  async crawlAll(maxPages = 20) {
    // load cache
  await this.crawlerService.loadExistingCompanyUrls();

  // lấy cache từ service
  this.existingCompanyUrls = this.crawlerService.existingCompanyUrls;
  this.companyUrlToIdMap = this.crawlerService.companyUrlToIdMap;

    let pageNumber = 1;
    let consecutiveErrors = 0;

    while (pageNumber <= maxPages) {
      const success = await this.crawlPage(pageNumber);

      if (!success) {
        consecutiveErrors++;
        if (consecutiveErrors >= 2) {
          console.log(`\n✗ Dừng lại sau ${consecutiveErrors} trang lỗi liên tiếp`);
          break;
        }
      } else {
        consecutiveErrors = 0;
      }

      pageNumber++;
      await sleep(3000);
    }

    const total = await prisma.company.count();
    console.log(`\n✅ Hoàn thành! Tổng cộng: ${total} công ty trong database`);
  }
}

export default JobsGoCrawler;
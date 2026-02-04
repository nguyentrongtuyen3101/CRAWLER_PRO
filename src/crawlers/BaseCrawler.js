import puppeteer from 'puppeteer';
import { browserConfig, navigationOptions } from '../config/browser.config.js';
import { crawlerConfig } from '../config/crawler.config.js';
import { sleep } from '../utils/helpers.js';

class BaseCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Khởi tạo browser...');
    this.browser = await puppeteer.launch(browserConfig);
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(crawlerConfig.userAgent);
    console.log('✓ Browser đã sẵn sàng');
  }

  async navigate(url) {
    console.log(`→ Đang truy cập: ${url}`);
    await this.page.goto(url, navigationOptions);
    await sleep(crawlerConfig.requestDelay);
  }

  async extractData(selectors) {
    const data = await this.page.evaluate((sel) => {
      const result = {};
      for (const [key, selector] of Object.entries(sel)) {
        const element = document.querySelector(selector);
        result[key] = element ? element.textContent.trim() : null;
      }
      return result;
    }, selectors);
    return data;
  }

  async extractMultiple(selector) {
    const items = await this.page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map(el => el.textContent.trim());
    }, selector);
    return items;
  }

  async screenshot(filename) {
    await this.page.screenshot({ 
      path: `./data/${filename}`,
      fullPage: true 
    });
    console.log(`✓ Screenshot: ${filename}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✓ Browser đã đóng');
    }
  }
}

export default BaseCrawler;
import BaseCrawler from './BaseCrawler.js';

class ForgotPasswordCrawler extends BaseCrawler {
  constructor(showUI = true) {
    super();
    this.loginUrl = 'https://khoaivt03.id.vn/auth/login';
    this.showUI = showUI;
  }

  generateRandomEmail() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let randomString = '';
    for (let i = 0; i < 15; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${randomString}@gmail.com`;
  }

  async init() {
    console.log('🚀 Khởi tạo browser...');
    const puppeteer = (await import('puppeteer')).default;
    
    this.browser = await puppeteer.launch({
      headless: !this.showUI,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
    
    this.page = await this.browser.newPage();
    const { crawlerConfig } = await import('../config/crawler.config.js');
    await this.page.setUserAgent(crawlerConfig.userAgent);
    console.log('✓ Browser đã sẵn sàng');
  }

  async performFullFlow() {
    try {
      const email = this.generateRandomEmail();
      
      // WEB 1: Login page
      console.log('📍 [WEB 1] Truy cập trang login...');
      await this.page.goto(this.loginUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      console.log('✓ [WEB 1] Đã tải trang login');

      // Chờ một chút để trang render đầy đủ
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Tìm link "Quên mật khẩu?"
      console.log('🔍 [WEB 1] Tìm link "Quên mật khẩu?"...');
      
      const forgotLink = await this.page.$('a[href="/auth/forgot-password"]');
      if (!forgotLink) {
        console.error('❌ Không tìm thấy link!');
        await this.page.screenshot({ path: './error_no_link.png' });
        throw new Error('Link không tồn tại');
      }

      console.log('✓ [WEB 1] Tìm thấy link');
      
      // Click vào link
      await forgotLink.click();
      console.log('✓ [WEB 1] Đã click link');

      // Chờ URL thay đổi
      await this.page.waitForFunction(
        () => window.location.pathname === '/auth/forgot-password',
        { timeout: 10000 }
      );
      console.log('✓ Đã chuyển sang /auth/forgot-password');

      // WEB 2: Forgot Password page
      console.log('📍 [WEB 2] Đang ở trang Forgot Password');
      
      // Chờ trang load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Tìm input email
      console.log('🔍 [WEB 2] Tìm input email...');
      const emailInput = await this.page.$('input#email');
      if (!emailInput) {
        console.error('❌ Không tìm thấy input!');
        await this.page.screenshot({ path: './error_no_input.png' });
        throw new Error('Input không tồn tại');
      }

      console.log('✓ [WEB 2] Tìm thấy input');

      // Click và nhập email
      await emailInput.click();
      await this.page.keyboard.type(email, { delay: 10 });
      console.log(`✓ [WEB 2] Đã nhập email: ${email}`);

      // Tìm button submit
      console.log('🔍 [WEB 2] Tìm button submit...');
      const submitBtn = await this.page.$('button[type="submit"]');
      if (!submitBtn) {
        console.error('❌ Không tìm thấy button!');
        await this.page.screenshot({ path: './error_no_button.png' });
        throw new Error('Button không tồn tại');
      }

      console.log('✓ [WEB 2] Tìm thấy button');

      // Click button
      await submitBtn.click();
      console.log('✓ [WEB 2] Đã click button');

      // Chờ 5 giây
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('⏱️  Đã chờ 5s');

      // WEB 3: Confirmation page
      console.log('📍 [WEB 3] Đang ở trang xác nhận');

      // Tìm link "Đăng nhập"
      console.log('🔍 [WEB 3] Tìm link "Đăng nhập"...');
      const loginLink = await this.page.$('a[href="/auth/login"]');
      if (!loginLink) {
        console.error('❌ Không tìm thấy link đăng nhập!');
        await this.page.screenshot({ path: './error_no_login_link.png' });
        throw new Error('Link đăng nhập không tồn tại');
      }

      console.log('✓ [WEB 3] Tìm thấy link');

      // Click link
      await loginLink.click();
      console.log('✓ [WEB 3] Đã click link');

      // Chờ quay về trang login
      await this.page.waitForFunction(
        () => window.location.pathname === '/auth/login',
        { timeout: 10000 }
      );
      console.log('✓ Đã quay về /auth/login');

      console.log('🎉 Hoàn thành 1 vòng!\n');
      return true;

    } catch (error) {
      console.error('✗ Lỗi:', error.message);
      
      try {
        if (this.browser) {
          await this.browser.close();
        }
        await this.init();
        console.log('✓ Đã khôi phục browser');
      } catch (e) {
        console.error('✗ Lỗi khôi phục:', e.message);
      }
      
      return false;
    }
  }

  async runMultipleTimes(times = 1000) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 BẮT ĐẦU CHẠY ${times} LẦN`);
    console.log(`${'='.repeat(70)}\n`);

    await this.init();

    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    for (let i = 1; i <= times; i++) {
      console.log(`${'▬'.repeat(70)}`);
      console.log(`🔄 VÒNG ${i}/${times}`);
      console.log(`${'▬'.repeat(70)}`);

      const success = await this.performFullFlow();

      if (success) {
        successCount++;
        console.log(`✅ VÒNG ${i}: THÀNH CÔNG\n`);
      } else {
        failCount++;
        console.log(`❌ VÒNG ${i}: THẤT BẠI\n`);
      }

      if (i % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const rate = (i / elapsed).toFixed(2);
        console.log(`\n📊 Tiến trình: ${i}/${times} | ✅ ${successCount} | ❌ ${failCount} | ⚡ ${rate}/s\n`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🏁 KẾT QUẢ: ✅ ${successCount}/${times} | ⏱️  ${totalTime}s`);
    console.log(`${'='.repeat(70)}\n`);

    await this.close();
  }
}

export default ForgotPasswordCrawler;
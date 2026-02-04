import ForgotPasswordCrawler from './crawlers/ForgotPasswordCrawler.js';

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          🚀 FORGOT PASSWORD AUTOMATION TOOL 🚀            ║
║                                                            ║
║  Website: https://khoaivt03.id.vn/auth/forgot-password   ║
║  Email: test@gmail.com                              ║
║  Số lần chạy: 1000                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  const crawler = new ForgotPasswordCrawler();

  try {
    // Chạy 1000 lần
    await crawler.runMultipleTimes(1000);
  } catch (error) {
    console.error('\n❌ LỖI NGHIÊM TRỌNG:', error);
    await crawler.close();
    process.exit(1);
  }
}

// Chạy chương trình
main().catch(error => {
  console.error('❌ LỖI KHÔNG XỬ LÝ ĐƯỢC:', error);
  process.exit(1);
});
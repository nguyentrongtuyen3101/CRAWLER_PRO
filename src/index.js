import JobsGoCrawler from './crawlers/jobsgo/JobsGoCrawler.js';

async function main() {
  const crawler = new JobsGoCrawler();

  try {
    await crawler.init();
    await crawler.crawlAll();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await crawler.close();
  }
}

main();
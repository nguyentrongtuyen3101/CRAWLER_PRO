// src/index-jobs.js
import JobsGoCrawlerToJob from './crawlers/jobsgo/JobsGoCrawlerToJob.js';

async function main() {
  const crawler = new JobsGoCrawlerToJob();

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
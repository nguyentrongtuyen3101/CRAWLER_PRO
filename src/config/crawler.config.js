export const crawlerConfig = {
  maxRetries: 3,
  retryDelay: 2000,
  requestDelay: 1000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

export const selectors = {
  // Cấu hình selector cho từng website
  example: {
    title: 'h1',
    content: '.content',
    links: 'a',
  },
};
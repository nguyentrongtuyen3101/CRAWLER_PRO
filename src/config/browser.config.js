export const browserConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
};

export const navigationOptions = {
  waitUntil: 'networkidle2',
  timeout: 30000,
};
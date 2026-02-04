// src/utils/hybridSkillExtractor.js
// Kết hợp nhiều phương pháp để đạt độ chính xác cao nhất

/**
 * SKILL DICTIONARY - Từ điển skills
 */
const SKILL_DICT = {
  exact: new Set([
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Go', 'Rust',
    'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'SQL', 'HTML', 'CSS', 'Golang',
    
    // Frameworks & Libraries
    'React', 'Angular', 'Vue', 'Next.js', 'Nuxt', 'Svelte', 'jQuery',
    'Node.js', 'Express', 'NestJS', 'Fastify', 'Koa',
    'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring', 'Hibernate',
    '.NET', 'ASP.NET', 'Laravel', 'Symfony', 'CodeIgniter',
    'Rails', 'Ruby on Rails', 'Flutter', 'React Native', 'Ionic',
    'TailwindCSS', 'Bootstrap', 'Material UI', 'Ant Design', 'Chakra UI',
    
    // Databases
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB',
    'Oracle', 'SQL Server', 'MariaDB', 'SQLite', 'Elasticsearch',
    'Neo4j', 'CouchDB', 'Firebase', 'Supabase',
    
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'DigitalOcean', 'Vercel', 'Netlify',
    'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI',
    'Terraform', 'Ansible', 'Puppet', 'Chef', 'CloudFormation',
    
    // Tools & Software
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
    'Jira', 'Confluence', 'Trello', 'Asana', 'Slack', 'Backlog', 'Redmine',
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    'VS Code', 'IntelliJ', 'Eclipse', 'Postman', 'Insomnia',
    
    // Testing
    'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'Puppeteer', 'Playwright',
    'JUnit', 'TestNG', 'PyTest', 'RSpec', 'Jasmine', 'Karma',
    
    // Mobile & Game Development
    'iOS', 'Android', 'Swift', 'Kotlin', 'Flutter', 'React Native',
    'Unity', '3D', '2D', 'Unreal Engine', 'Cocos2d', '3DCG', 'VFX',
    
    // AI/ML
    'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'Pandas', 'NumPy',
    'OpenCV', 'NLTK', 'spaCy', 'Hugging Face', 'LangChain',
    
    // Design & 3D
    'UI/UX', 'Figma', 'Sketch', 'Adobe XD', 'Adobe Photoshop', 'Adobe Illustrator',
    'Blender', 'Maya', 'Cinema 4D', '3ds Max', 'AutoCAD', 'SolidWorks',
    'Autodesk Inventor', 'SketchUp', 'ZBrush',
    
    // Mechanical & Manufacturing
    'CNC', 'PLC', 'CAD', 'CAM', 'Skinning', 'AGV',
    
    // Business & ERP
    'ERP', 'SAP', 'Salesforce', 'HubSpot', 'Shopify',
    
    // Methodologies
    'Agile', 'Scrum', 'Kanban', 'Waterfall', 'DevOps', 'CI/CD',
    'TDD', 'BDD', 'Microservices', 'REST API', 'GraphQL', 'gRPC',
    
    // Languages (Human)
    'JLPT', 'TOEIC', 'IELTS', 'N1', 'N2', 'N3', 'N4', 'N5',
    
    // Other
    'Papaparse', 'Chart.js', 'D3.js', 'Three.js', 'Tone.js'
  ]),
  
  patterns: [
    // Version patterns
    /\b(Node\.js|Next\.js|Vue\.js|Three\.js|D3\.js|Chart\.js|Tone\.js)\b/gi,
    // Special chars
    /\b(C\+\+|C#|\.NET|ASP\.NET|UI\/UX)\b/gi,
    // Numbers
    /\b(3D|2D|3DCG)\b/gi,
    // Japanese levels
    /\b(N[1-5]|JLPT\s*N[1-5])\b/gi
  ]
};

/**
 * Method 1: Dictionary Matching
 */
function matchDictionary(text) {
  const found = new Set();
  
  // Exact matches
  SKILL_DICT.exact.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      // Giữ nguyên case của skill trong dictionary
      found.add(skill);
    }
  });
  
  // Pattern matches
  SKILL_DICT.patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        // Normalize case
        const normalized = Array.from(SKILL_DICT.exact).find(
          s => s.toLowerCase() === m.toLowerCase()
        ) || m;
        found.add(normalized);
      });
    }
  });
  
  return Array.from(found);
}

/**
 * Method 2: Capitalized Words (likely tech names)
 */
function extractCapitalized(text) {
  const words = text.match(/\b[A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z]+)?\b/g) || [];
  
  // Filter out common words
  const stopwords = new Set([
    'The', 'This', 'That', 'These', 'Those', 'And', 'Or', 'But', 'For', 'With',
    'From', 'To', 'In', 'On', 'At', 'By', 'About', 'As', 'Into', 'Through',
    'During', 'Before', 'After', 'Above', 'Below', 'Between', 'Under', 'Since',
    'Team', 'Director', 'Manager', 'Developer', 'Engineer', 'Designer',
    'Company', 'Project', 'System', 'Application', 'Software', 'Hardware'
  ]);
  
  return words.filter(w => 
    w.length > 2 && 
    !stopwords.has(w) &&
    !/^\d+$/.test(w) // not just numbers
  );
}

/**
 * Method 3: Vietnamese Experience Patterns
 */
function extractFromVietnamesePatterns(text) {
  const patterns = [
    // "3 năm kinh nghiệm với React"
    /(\d+)\s+năm.*?(?:với|sử dụng|về|làm việc với)\s+([A-Za-z][A-Za-z0-9\.\+\#]+)/gi,
    // "Thành thạo Java, Python"
    /(?:thành thạo|thành thục|sử dụng tốt|am hiểu|hiểu biết)\s+([A-Za-z][A-Za-z0-9\.\+\#,\s]+)/gi,
    // "Kinh nghiệm về NodeJS"
    /kinh nghiệm.*?(?:về|với|sử dụng|làm việc với)\s+([A-Za-z][A-Za-z0-9\.\+\#]+)/gi,
    // "Yêu cầu: React, Vue"
    /yêu cầu.*?:\s*([A-Za-z][A-Za-z0-9\.\+\#,\s]+)/gi,
    // "Có kinh nghiệm Skinning"
    /có kinh nghiệm\s+(?:về\s+)?([A-Za-z][A-Za-z0-9\.\+\#]+)/gi,
    // "sử dụng Maya"
    /sử dụng\s+([A-Z][A-Za-z0-9\.\+\#]+)/gi
  ];
  
  const found = new Set();
  
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      // Get the captured skill part
      const skillText = match[match.length - 1];
      // Split by comma and clean
      const skills = skillText.split(/[,،、]/g)
        .map(s => s.trim())
        .filter(s => s.length > 2 && /^[A-Za-z]/.test(s));
      
      skills.forEach(s => found.add(s));
    });
  });
  
  return Array.from(found);
}

/**
 * Method 4: Common Job Skill Phrases
 */
function extractCommonPhrases(text) {
  const phrases = [
    'kinh nghiệm', 'sử dụng', 'thành thạo', 'am hiểu',
    'hiểu biết', 'làm việc với', 'có khả năng', 'experience with',
    'experience in', 'proficient in', 'skilled in', 'knowledge of'
  ];
  
  const found = new Set();
  
  phrases.forEach(phrase => {
    // Find text after phrase
    const regex = new RegExp(`${phrase}[^.]*?([A-Z][A-Za-z0-9\\.\\+\\#]+)`, 'gi');
    const matches = [...text.matchAll(regex)];
    
    matches.forEach(match => {
      const skill = match[1];
      if (skill.length > 2) {
        found.add(skill);
      }
    });
  });
  
  return Array.from(found);
}

/**
 * Scoring function - đánh giá độ tin cậy của skill
 */
function scoreSkill(skill, text) {
  let score = 0;
  
  // +3 if in dictionary
  if (SKILL_DICT.exact.has(skill)) score += 3;
  
  // +2 if capitalized
  if (/^[A-Z]/.test(skill)) score += 2;
  
  // +1 if contains dot (Node.js, Next.js)
  if (skill.includes('.')) score += 1;
  
  // +2 if appears multiple times
  const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (text.match(new RegExp(escapedSkill, 'gi')) || []).length;
  if (count > 1) score += 2;
  
  // +1 if near keywords
  const context = text.toLowerCase();
  const keywords = ['kinh nghiệm', 'năm', 'thành thạo', 'sử dụng', 'experience', 'years'];
  const skillLower = skill.toLowerCase();
  if (keywords.some(kw => context.includes(kw + ' ' + skillLower) || context.includes(skillLower + ' ' + kw))) {
    score += 1;
  }
  
  return score;
}

/**
 * MAIN FUNCTION: Hybrid Extraction
 */
export function extractSkillsHybrid(description, requirements, options = {}) {
  const {
    minScore = 2,
    maxSkills = 15
  } = options;
  
  const combinedText = `${description} ${requirements.join(' ')}`;
  
  console.log('  → Phân tích skills (Hybrid method)...');
  
  // Run all methods
  const method1 = matchDictionary(combinedText);
  const method2 = extractCapitalized(combinedText);
  const method3 = extractFromVietnamesePatterns(combinedText);
  const method4 = extractCommonPhrases(combinedText);
  
  console.log(`    Method 1 (Dictionary): ${method1.length} skills`);
  console.log(`    Method 2 (Capitalized): ${method2.length} skills`);
  console.log(`    Method 3 (Vietnamese): ${method3.length} skills`);
  console.log(`    Method 4 (Phrases): ${method4.length} skills`);
  
  // Combine all
  const allSkills = [...method1, ...method2, ...method3, ...method4];
  
  // Score and filter
  const skillScores = new Map();
  
  allSkills.forEach(skill => {
    const normalized = skill.trim();
    if (normalized.length > 1) {
      const currentScore = skillScores.get(normalized) || 0;
      const newScore = scoreSkill(normalized, combinedText);
      skillScores.set(normalized, Math.max(currentScore, newScore));
    }
  });
  
  // Sort by score and filter
  const topSkills = Array.from(skillScores.entries())
    .filter(([_, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSkills)
    .map(([skill, score]) => {
      console.log(`    - ${skill} (score: ${score})`);
      return skill;
    });
  
  console.log(`  ✓ Tìm thấy ${topSkills.length} skills với độ tin cậy cao`);
  
  return topSkills;
}

/**
 * Quick version với default params
 */
export function extractSkillsQuick(description, requirements) {
  return extractSkillsHybrid(description, requirements, {
    minScore: 2,
    maxSkills: 10
  });
}

/**
 * Strict version - chỉ lấy skills có độ tin cậy rất cao
 */
export function extractSkillsStrict(description, requirements) {
  return extractSkillsHybrid(description, requirements, {
    minScore: 4,
    maxSkills: 8
  });
}

/**
 * Add new skill to dictionary
 */
export function addSkillToDict(skill) {
  SKILL_DICT.exact.add(skill);
  console.log(`  ✓ Đã thêm skill: ${skill}`);
}

/**
 * Add multiple skills
 */
export function addSkillsToDict(skills) {
  skills.forEach(skill => SKILL_DICT.exact.add(skill));
  console.log(`  ✓ Đã thêm ${skills.length} skills`);
}

/**
 * Get all skills in dictionary
 */
export function getAllSkillsInDict() {
  return Array.from(SKILL_DICT.exact);
}

/**
 * Export dictionary for external use
 */
export { SKILL_DICT };
import prisma from '../prisma/client.js';

export class CrawlerService {
    constructor() {
        this.existingCompanyNames = new Set();
        this.existingCompanyUrls = new Set();
        this.existingJobUrls = new Set();
        this.companyUrlToIdMap = new Map();
    }
    // ✅ Load company URLs và trả về Set
    async loadExistingCompanyUrls() {
        try {
            const companies = await prisma.company.findMany({
                select: { id: true, companyUrl: true }
            });

            this.existingCompanyUrls = new Set();
            this.companyUrlToIdMap = new Map();

            companies.forEach(c => {
                c.companyUrl?.forEach(url => {
                    this.existingCompanyUrls.add(url);
                    this.companyUrlToIdMap.set(url, c.id);
                });
            });

            console.log(
                `✓ Loaded ${this.existingCompanyUrls.size} company URLs`
            );
        } catch (error) {
            console.log('→ Không load được company URLs', error);
        }
    }


    async loadExistingJobUrls() {
    try {
        const jobs = await prisma.job.findMany({
        select: { jobUrl: true }
        });

        this.existingJobUrls = new Set(
        jobs.map(j => j.jobUrl).filter(Boolean)
        );
        console.log(`✓ Đã load ${this.existingJobUrls.size} job URLs từ database`);
    } catch (error) {
        console.log('→ Không load được job URLs từ database');
        this.existingJobUrls = new Set();
    }
    }
    async saveCompany(company) {
        try {
            const existing = await prisma.company.findFirst({
                where: {
                    OR: [
                        { taxCode: company.taxCode },
                    ]
                }
            });

            if (existing) {
                const newUrl = company.companyUrl[0];
                const urlExists = existing.companyUrl.includes(newUrl);

                if (urlExists) {
                    console.log(`↪ Bỏ qua: ${existing.name} (URL đã tồn tại)`);
                    return;
                }

                const updated = await prisma.company.update({
                    where: { id: existing.id },
                    data: {
                        ...company,
                        companyUrl: [...existing.companyUrl, newUrl],
                        updatedAt: new Date()
                    }
                });
                console.log(`✓ Đã cập nhật: ${updated.name} (thêm URL mới)`);
            } else {
                const created = await prisma.company.create({
                    data: company
                });
                console.log(`✓ Đã lưu: ${created.name}`);
            }

            this.existingCompanyNames.add(company.name.toLowerCase());
            company.companyUrl.forEach(url => this.existingCompanyUrls.add(url));

            const total = await prisma.company.count();
            console.log(`  (Tổng: ${total} công ty)`);

        } catch (error) {
            console.error(`✗ Lỗi lưu công ty: ${error.message}`);
            throw error;
        }
    }

    async saveJob(job) {
        try {
            // Check if job with same jobUrl already exists
            const existing = await prisma.job.findFirst({
                where: { jobUrl: job.jobUrl }
            });

            if (existing) {
                console.log(`↪ Bỏ qua: ${job.title} (URL đã tồn tại)`);
                return;
            }

            // Create new job
            const created = await prisma.job.create({
                data: job
            });
            console.log(`✓ Đã lưu job: ${created.title}`);

            // Update cache
            this.existingJobUrls.add(job.jobUrl);

            // Get total count
            const total = await prisma.job.count();
            console.log(`  (Tổng: ${total} jobs)`);

        } catch (error) {
            console.error(`✗ Lỗi lưu job: ${error.message}`);
            throw error;
        }
    }
}
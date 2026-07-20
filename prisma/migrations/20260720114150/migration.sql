-- AlterTable
ALTER TABLE `Announcement` ADD COLUMN `buttonBgColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN `buttonBold` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `buttonFontSize` INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN `buttonTextColor` VARCHAR(191) NOT NULL DEFAULT '#000000',
    ADD COLUMN `htmlContent` LONGTEXT NULL,
    ADD COLUMN `marginBottom` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `marginTop` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `paddingBottom` INTEGER NOT NULL DEFAULT 8,
    ADD COLUMN `paddingTop` INTEGER NOT NULL DEFAULT 8,
    ADD COLUMN `sliderArrowsPosition` VARCHAR(191) NOT NULL DEFAULT 'corners',
    ADD COLUMN `sliderShowArrows` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `subtextBold` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `subtextColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN `subtextFontSize` INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN `timerBgColor` VARCHAR(191) NOT NULL DEFAULT 'rgba(0,0,0,0.2)',
    ADD COLUMN `timerFontSize` INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN `timerHeight` VARCHAR(191) NOT NULL DEFAULT 'auto',
    ADD COLUMN `timerPosition` VARCHAR(191) NOT NULL DEFAULT 'default',
    ADD COLUMN `timerTextColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN `timerWidth` VARCHAR(191) NOT NULL DEFAULT 'auto',
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    MODIFY `customCss` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `AnnouncementAnalytics` (
    `id` VARCHAR(191) NOT NULL,
    `announcementId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,

    INDEX `AnnouncementAnalytics_announcementId_idx`(`announcementId`),
    UNIQUE INDEX `AnnouncementAnalytics_announcementId_date_key`(`announcementId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnnouncementAnalytics` ADD CONSTRAINT `AnnouncementAnalytics_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
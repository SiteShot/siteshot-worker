const logger = require('siteshot-logger');
const config = require('config');
const fs = require('fs');
const path = require('path');
const async = require('async');
const utils = require('siteshot-utils');
const gm = require('gm').subClass({
    imageMagick: true
});

const remoteNotificationService = require("./remoteNotificationService");

exports.CreateThumbnails = function (job, callback) {
    logger.info("Doing thumbnails");

    remoteNotificationService.UpdateScanStatus('Creating thumbnails', job.siteId, job.scanId);

    async.eachSeries(
        job.pages,
        function (page, cb) {
            logger.info("Creating thumbnail", page.url);

            if (job.previousScan === undefined) {
                page.currentImagePath = path.join(job.folder, utils.PageNameFromURL(page.url) + '.png');
                page.currentImageThumbPath = path.join(job.folder, utils.PageNameFromURL(page.url) + '.thumb.png');

                page.diffImagePath = path.join(job.folder, utils.PageNameFromURL(page.url) + '.diff.png');
                page.diffImageThumbPath = path.join(job.folder, utils.PageNameFromURL(page.url) + '.diff.thumb.png');

                page.overlayImagePath = path.join(job.folder, utils.PageNameFromURL(page.url) + '.overlay.png');
                page.overlayImageThumbPath = path.join(job.folder, utils.PageNameFromURL(page.url) + '.overlay.thumb.png');
            }

            async.waterfall([
                function (next) {
                    logger.info("Trying to thumbnail", page.currentImagePath);
                    gm(page.currentImagePath).thumb(300, 300, page.currentImageThumbPath, 100, function () {
                        next();
                    });
                },
                function (next) {
                    logger.info("Trying to thumbnail", page.diffImagePath);
                    gm(page.diffImagePath).thumb(300, 300, page.diffImageThumbPath, 100, function () {
                        next();
                    });
                },
                function (next) {
                    logger.info("Trying to thumbnail", page.overlayImagePath);
                    gm(page.overlayImagePath).thumb(300, 300, page.overlayImageThumbPath, 100, function () {
                        next();
                    });
                }
            ], function () {
                cb(arguments);
            });
        },
        function done() {
            callback();
        }
    );
};
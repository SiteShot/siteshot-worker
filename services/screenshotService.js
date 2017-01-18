const async = require('async');
const webshot = require('webshot');
const fs = require('fs');
const path = require('path');
const utils = require('siteshot-utils');
const logger = require('siteshot-logger');

const remoteNotificationService = require("./remoteNotificationService");

/**
 * Scans through the tree and creates screenshots
 * @param job
 * @param callback
 * @constructor
 */
exports.ScreenshotTree = function (job, callback) {
    var webShotOptions = {
        screenSize: {
            width: 1280,
            height: 1024
        },
        shotSize: {
            width: 1280,
            height: 'all'
        },
        customHeaders: {
            'x-auth': job.site.authToken
        }
    };

    remoteNotificationService.UpdateScanStatus('Getting screenshots', job.siteId, job.scanId);

    async.eachSeries(
        job.pages,
        function (item, next) {
            var pageName = utils.PageNameFromURL(item.url);
            logger.info(job, "Trying to screenshot " + pageName);

            webshot(job.site.domain + item.url, path.join(job.folder, pageName + ".png"), webShotOptions, function (err) {
                if (!err) {
                    logger.info(job, "Created screenshot" + path.join(job.folder, pageName + ".png"));
                } else {
                    logger.info(job, "Error creating shot" + err);
                }

                next(err);
            });
        },
        function done(err) {
            logger.error("Screenshot error", err);
            return callback(err);
        }
    );
};
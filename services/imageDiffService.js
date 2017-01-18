const async = require('async');
const fs = require('fs');
const path = require('path');
const storageService = require('siteshot-azure-storage-provider');
const logger = require('siteshot-logger');
const imageDiff = require('image-diff');

const gm = require('gm').subClass({
    imageMagick: true
});

const remoteNotificationService = require("./remoteNotificationService");

/**
 * Diffs a job tree
 * @param job
 * @param callback
 * @constructor
 */
exports.DiffJobTree = function (job, callback) {
    console.log("Doing diff");

    // If we don't have a previous scan, there's not much we can do
    if (job.previousScan === undefined) {
        logger.info(job, "No previous scan, jumping out");
        return callback();
    }

    async.waterfall(
        [
            function DownloadImages(next) {
                logger.info(job, "Getting previous images");
                logger.info("Getting previous images");

                storageService.FetchFilesForJob(job, function () {
                    logger.info("Got previous images");
                    next();
                });
            },
            function CompareImages(next) {
                remoteNotificationService.UpdateScanStatus('Comparing', job.siteId, job.scanId);

                async.eachSeries(
                    job.pages,
                    function (page, cb) {
                        logger.info("Diffing page", page);

                        imageDiff({
                            actualImage: page.currentImagePath,
                            expectedImage: page.previousImagePath,
                            diffImage: page.diffImagePath
                        }, function (err, imagesAreSame) {
                            // Mark the job page as changed
                            page.changed = !imagesAreSame;

                            gm()
                                .subCommand('composite')
                                .in('-compose', 'Over', page.diffImagePath, page.currentImagePath)
                                .in('-compose', 'dissolve')
                                .in('-define', 'compose:args=10')
                                .write(page.overlayImagePath, function (err) {
                                    cb(err);
                                });
                        });
                    },
                    function done() {
                        next();
                    }
                );
            }
        ],
        function (err, scans) {
            if (err) {
                logger.error("Diff err", err);
            }

            return callback(err, scans);
        }
    );
};
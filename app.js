"use strict";

const config = require('config');
const packages = require('./package');
const raygun = require('raygun');
const logger = require('siteshot-logger');
const git = require('git-rev');

const raygunClient = new raygun.Client().init({apiKey: config.Raygun.Key});
raygunClient.setVersion(packages.version);

const remoteNotificationService = require("./services/remoteNotificationService");

var gitHash = null;
git.long(function (hash) {
    gitHash = hash;
});

const siteshotDomain = require('domain').create();
siteshotDomain.on('error', function (err) {
    if (process.env.NODE_ENV === undefined) {
        throw err;
    }

    raygunClient.send(err, {
        hash: gitHash
    }, function () {
        remoteNotificationService.Shutdown(function () {
            console.log(err);
            process.exit();
        });
    });
});

siteshotDomain.run(function () {
    const path = require('path');
    const async = require('async');
    const utils = require('siteshot-utils');
    const queueService = require('siteshot-azure-queue-provider');
    const storageService = require('siteshot-azure-storage-provider');

    const screenshotService = require('./services/screenshotService');
    const imageDiffService = require('./services/imageDiffService');
    const thumbnailService = require('./services/thumbnailService');

    var passes = 0;

    storageService.Setup();
    queueService.SetupQueues();
    utils.CreateDirIfNotExists(config.Storage.Folder);

    try {
        // Register the server with Siteshot API
        remoteNotificationService.Register(function () {
            logger.info("Registered with server");

            // Then start the process... Hopefully we pickup the right job
            CheckForJob();
        });
    } catch (e) {
        throw e;
    }

    function SetupFolders(job, next) {
        logger.jobLog(job, "Setting up folder for" + job.siteId);

        utils.CreateDirIfNotExists(path.join(config.Storage.Folder, job.siteId));

        job.siteFolder = path.join(config.Storage.Folder, job.siteId);
        job.folder = path.join(job.siteFolder, job.scanId);
        job.subFolder = path.join(job.siteId, job.scanId);

        utils.CreateDirIfNotExists(job.folder);

        next();
    }

    function CheckForJob() {
        queueService.CheckForScanJobs(function (job, done) {
            job.job.date = new Date();

            remoteNotificationService.UpdateScanStatus('Starting...', job.siteId, job.scanId);

            async.waterfall([
                    async.apply(SetupFolders, job.job),
                    async.apply(screenshotService.ScreenshotTree, job.job),
                    async.apply(imageDiffService.DiffJobTree, job.job),
                    async.apply(thumbnailService.CreateThumbnails, job.job),
                    async.apply(storageService.UploadJob, job.job)
                ],
                function (err) {
                    if (err) {
                        logger.error("Waterfall error", err);
                    }

                    remoteNotificationService.Complete(job.job, function () {
                        remoteNotificationService.Shutdown();
                        done(job);
                    });
                });
        }, function () {
            passes++;

            logger.debug("Finished current queue scan");

            if (passes > 10) {
                remoteNotificationService.Shutdown();
            } else {
                setTimeout(CheckForJob, 1000);
            }
        });
    }
});
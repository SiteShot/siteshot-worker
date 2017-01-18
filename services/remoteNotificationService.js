"use strict";

const os = require('os');
const networkInterfaces = os.networkInterfaces();
const logger = require('siteshot-logger');
const queueService = require('siteshot-azure-queue-provider');

function GenerateBasicJob() {
    return {
        hostName: os.hostname(),
        ipAddress: networkInterfaces['eth0'] !== undefined ? networkInterfaces['eth0'][0].address : 'DevMachine',
        model: 512
    };
}

/**
 * Registers the current server with the SiteShot machine tracker
 * @param callback
 * @constructor
 */
exports.Register = function (callback) {
    var job = GenerateBasicJob();


    queueService.PublishToUpdateQueue('CreateServer', job, function () {
        callback();
    });
};

/**
 * Tells the SiteShot API to shutdown this machine
 * @constructor
 */
exports.Shutdown = function (callback) {
    var registerBody = GenerateBasicJob();

    queueService.PublishToUpdateQueue('Shutdown', registerBody, function () {
        if (callback) {
            callback();
        }
    });
};

/**
 * Updates a scan with the given status
 * @param status
 * @param siteId
 * @param scanId
 * @param callback
 * @constructor
 */
exports.UpdateScanStatus = function (status, siteId, scanId, callback) {
    var registerBody = GenerateBasicJob();
    registerBody.status = status;
    registerBody.scanId = scanId;
    registerBody.siteId = siteId;

    queueService.PublishToUpdateQueue('Status', registerBody, function () {
        if (callback) {
            callback();
        }
    });
};

/**
 * Tells the SiteShot API that the given job is finished
 * @constructor
 */
exports.Complete = function (job, callback) {
    var jobBody = GenerateBasicJob();
    jobBody.job = job;

    queueService.PublishToUpdateQueue('Complete', jobBody, function () {
        callback();
    });
};
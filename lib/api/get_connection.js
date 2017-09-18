'use strict';

/*
 Common events
 error
 connected
 reconnected
 */
const getModule = require('../file_utils').getModule;

module.exports = function module(context) {
    const sysconfig = context.sysconfig;
    const logger = context.logger;

    const connections = {};

    /*
     * Connectors can either be JavaScript file in a directory or can be packaged
     * as a npm module.
     */
    function loadConnector(type) {
        const localPath = `${__dirname}/../connectors/${type}.js`;
        const paths = {};
        paths[localPath] = true;
        paths[type] = true;

        const err = `Could not find connector implementation for: ${type}\n`;

        return getModule(type, paths, err);
    }

    /*
     * Creates a new connection to a remote service.
     *
     * options.type
     * options.endpoint
     * options.cached
     */
    return function getConnection(options) {
        const type = options.type;
        let endpoint = options.endpoint;
        const cached = options.cached;

        if (!endpoint) {
            endpoint = 'default';
        }

        // If it's acceptable to use a cached connection just return instead
        // of creating a new one
        const key = `${type}:${endpoint}`;

        if (cached && connections.hasOwnProperty(key)) {
            return connections[key];
        }

        if (sysconfig.terafoundation.connectors.hasOwnProperty(type)) {
            logger.info(`Creating connection for ${type}`);

            let moduleConfig = {};

            if (sysconfig.terafoundation.connectors[type].hasOwnProperty(endpoint)) {
                moduleConfig = sysconfig.terafoundation.connectors[type][endpoint];
            // If an endpoint was specified and doesn't exist we need to error.
            } else if (endpoint) {
                throw new Error(`No ${type} endpoint configuration found for ${endpoint}`);
            }

            const connector = loadConnector(type);

            const connection = connector.create(moduleConfig, logger, options);

            if (cached) {
                connections[key] = connection;
            }

            return connection;
        }

        throw new Error(`No connection configuration found for ${type}`);
    };
};

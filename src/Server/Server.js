'use strict';

const NodeRSA = require('node-rsa');

const BaseServer = require('./BaseServer');
const Plugins = require('./Plugins');

const ServerDefaults = require('../Util/Constants/ServerDefaults');
const Util = require('../Util/Util');

class Server extends BaseServer {

	constructor(options = {}) {
		if (!Util.isObject(options)) throw new TypeError('Options must be an object.');
		options = Util.mergeDefault(ServerDefaults, options);
		super(options);

		/**
         * The options the client was initialized with.
         * @name Server#options
         * @type {ServerOptions}
         */
		this.options = options;

		/**
         * The server key for this minecraft server. Required for authentication.
         * @since 0.0.1
         * @name Server#serverKey
         * @type {NodeRSA}
         */
		this.serverKey = new NodeRSA({ b: 1024 });

		/**
         * The player count of this server.
         * @since 0.0.1
         * @name Server#playerCount
         * @type {number}
         * @default 0
         */
		this.playerCount = 0;

		/**
         * The maximum amount of players for this server.
         * @since 0.0.1
         * @name Server#maxPlayers
         * @type {number}
         * @default 20
         */
		this.maxPlayers = 20;

		/**
         * A list of players excluded from being verified for online mode.
         * @since 0.0.1
         * @name Server#onlineModeExceptions
         * @type {object}
         * @defaults {}
         */
		this.onlineModeExceptions = {};

		/**
         * A buffer repesenting the favicon of the server.
         * @since 0.0.1
         * @name Server#favicon
         * @type {(buffer|null)}
         */
		this.favicon = null;
	}

	/**
     * Listens to the specified port/host on your server.
     * @param {number} port The port to listen to.
     * @param {*} host the host to listen on.
     */
	static listen(port, host) {
		super.on('connection', (client) => {
			Plugins.forEach(plugin => plugin(client, this, this.options));
		});
		super.listen(port, host);
	}


}

module.exports = Server;

'use strict';

const net = require('net');
const { EventEmitter } = require('events');

const BaseClient = require('../Client/BaseClient');
const States = require('../Util/Constants/States');

const Serializer = require('../Util/Serializer');

/**
 * Constucts a basic minecraft protocol server.
 * @since 0.0.1
 * @param {string} version The minecraft server version
 * @param {object} customPackets Any custom packets this server might need to handle.
 * @param {boolean} hideErrors Should we hide errors?
 */

class Server extends EventEmitter {

	constructor({ version, customPackets, hideErrors = false }) {
		super();

		/**
         * The minecraft version of this minecraft server.
         * @since 0.0.1
         * @type {(string|object)}
         */
		this.version = version;

		/**
         * The net socket server created and listening.
         * @since 0.0.1
         * @type {Socket}
         */
		this.socketServer = null;

		/**
         * A object of all clients connected to the server.
         * @since 0.0.1
         * @type {Object<Object}
         */
		this.clients = {};

		/**
         * Object of all custom packets we should parse.
         * @since 0.0.1
         * @type {Object}
         */
		this.customPackets = customPackets;

		/**
         * Should we ignore errors?
         * @since 0.0.1
         * @type {boolean}
         */
		this.hideErrors = hideErrors;

		/**
         * Packet seriaizer
         * @since 0.0.1
         * @type {Serializer}
         */
		this.serializer = new Serializer({ state: 'play', isServer: true, version, customPackets });
	}

	/**
	 * Creates a net socker server and listens on the port/host you specify.
	 * @param {number} [port=25565] The port on the system to listen to.
	 * @param {string} [host=0.0.0.0] The ip on the system to listen to. If unavailable you will recieve a socket error.
	 *
	 */
	listen(port = 25565, host = '0.0.0.0') {
		const that = this;
		let nextId = 0;
		that.socketServer = net.createServer();
		that.socketServer.on('connection', socket => {
			const client = new BaseClient({ isServer: true, version: this.version, customPackets: this.customPackets, hideErrors: this.hideErrors });
			client._end = client.end;
			client.end = function end(endReason, fullReason = JSON.stringify({ text: endReason })) {
				if (client.state === States.PLAY) {
					client.write('kick_disconnect', { reason: fullReason });
				} else if (client.state === States.LOGIN) {
					client.write('disconnect', { reason: fullReason });
				}
				client._end(endReason);
			};
			client.id = nextId++;
			that.clients[client.id] = client;
			client.on('end', () => {
				delete that.clients[client.id];
			});
			client.setSocket(socket);
			that.emit('connection', client);
		});
		that.socketServer.on('error', (err) => {
			that.emit('error', err);
		});
		that.socketServer.on('close', () => {
			that.emit('close');
		});
		that.socketServer.on('listening', () => {
			that.emit('listening');
		});
		that.socketServer.listen(port, host);
	}

	/**
	 * Equivalent of running /stop on a Java Minecraft Server.
	 * @since 0.0.1
	 * @returns {null}
	 */
	close() {
		Object.keys(this.clients).forEach(clientId => {
			const client = this.clients[clientId];
			client.end('ServerShutdown');
		});
		return this.socketServer.close();
	}

	/**
	 * Broadcasts packets to all clients.
	 * @param {Array<Object>} clients An array of clients.
	 * @param {string} name The name of the packet.
	 * @param {*} params The data of the packet.
	 */
	writeToClients(clients, name, params) {
		if (clients.length === 0) return;
		const buffer = this.serializer.createPacketBuffer({ name, params });
		clients.forEach(client => client.writeRaw(buffer));
	}

}

module.exports = Server;

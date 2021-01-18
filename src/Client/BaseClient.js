'use strict';

const EventEmitter = require('events');
const net = require('net');
const dns = require('dns');
const crypto = require('crypto');
const minecraftData = require('minecraft-data');
const Constants = require('../Util/Constants');
const Util = require('../Util/Util');

const Splitter = require('../Util/Splitter');
const Framer = require('../Util/Framer');
const Compressor = require('../Util/Compressor');
const Decompressor = require('../Util/Decompressor');
const Cipher = require('../Util/Cipher');
const Decipher = require('../Util/Decipher');
const createSerializer = require('../Util/Serializer');
const createDeserializer = require('../Util/Deserializer');

const debug = require('debug')('minecraft-protocol:baseclient');

/**
 * Constructs the base client. This is practically a serializer.
 * @param {BaseClientOptions} [options={}] The configuration to pass to this class.
 */

class BaseClient extends EventEmitter {

	constructor(options = {}) {
		if (!Util.isObject(options)) throw new TypeError('BaseClient must be initiated with an object!');
		super();

		/**
		 * The options the client was initiated with.
		 * @name BaseClient#options
		 * @type {BaseClientOptions}
		 */

		this.options = Util.mergeDefault(Constants.BaseClient, options);
		const minecraftdata = minecraftData(this.options.version);
		if (!minecraftdata) throw Error(`Unsupported Protocol Version: ${this.options.version}`);
		this.version = minecraftdata.version;

		/**
		 * Whether or not this process is in production or not.
		 * @type {boolean}
		 * @default false
		 */
		// eslint-disable-next-line no-process-env
		this.production = process.env.NODE_ENV === 'production' || this.options.production;

		/**
		 * The Minecraft Version of the server we are connecting to. Set to '1.16.4' by default, 'false' to auto-detect.
		 * @type {string|boolean}
		 */
		this._version = this.options.version;

		/**
		 * Whether or not this bot has been ended/destroyed.
		 * @type {boolean}
		 */
		this._ended = true;

		/**
		 * The state this bot is in with trying to connect to the remote host.
		 * @type {string}
		 */
		this.state = Constants.ProtocolStates.HANDSHAKING;

		/**
		 * Splitter that will be used to read packets.
		 * @type {Splitter}
		 * @param {object}
		 */
		this.splitter = new Splitter();

		/**
		 * Framer that will be used to rebuild packets.
		 * @type {Framer}
		 * @param {object}
		 */
		this.framer = new Framer();

		/**
		 * The compressor used deflate packets.
		 * @type {Compressor}
		 * @param {object}
		 */
		this.compressor = null;

		/**
		 * The decompressor used to gunzip packets.
		 * @type {Decompressor}
		 * @param {object}
		 */
		this.decompressor = null;

		/**
		 * The cipher used to encrypt packets to the server.
		 * @type {Cipher}
		 */
		this.cipher = null;

		/**
		 * The decipher used to decript packets from the server.
		 */
		this.decipher = null;

		/**
		 * Current state of the protocol handler.
		 * @type {boolean|string}
		 */
		this.propertyState = null;

		/**
		 * Packet serializer
		 * @type {Serializer}
		 */
		this.serializer = null;

		/**
		 * Packet deserializer
		 * @type {Deserializer}
		 */
		this.deserializer = null;

		/**
		 * The timer for detecting if we disconnected or lost connection with the remove server
		 * @type {boolean|Function}
		 */
		this.closeTimer = null;
	}

	get state() {
		return this.protocolState || 'Unknown';
	}

	set state(property) {
		const oldProperty = this.propertyState;
		this.protocolState = property;

		if (this.serializer) {
			if (!this.compressor) {
				this.serializer.unpipe();
				this.splitter.unpipe(this.deserializer);
			} else {
				this.serializer.unpipe(this.compressor);
				this.decompressor.unpipe(this.deserializer);
			}

			this.serializer.removeAllListeners();
			this.deserializer.removeAllListeners();
		}
		this.setSerializer(this.protocolState);

		if (!this.compressor) {
			this.serializer.pipe(this.framer);
			this.splitter.pipe(this.deserializer);
		} else {
			this.serializer.pipe(this.compressor);
			this.decompressor.pipe(this.deserializer);
		}

		this.emit('state', property, oldProperty);
	}

	get compressionThreshold() {
		return this.compressor === null ? -2 : this.compressor.compressionThreshold;
	}

	set compressionThreshold(threshold) {
		this.setCompressionThreshold(threshold);
	}

	setCompressionThreshold(threshold) {
		if (this.compressor === null) {
			this.compressor = new Compressor(threshold);
			this.compressor.on('error', (err) => this.emit('error', err));

			this.serializer.unpipe(this.framer);
			this.serializer.pipe(this.compressor).pipe(this.framer);

			this.decompressor = new Decompressor(threshold, this.production);
			this.decompressor.on('error', (err) => this.emit('error', err));

			this.splitter.unpipe(this.deserializer);
			this.splitter.pipe(this.decompressor).pipe(this.deserializer);
		} else {
			this.decompressor.threshold = threshold;
			this.compressor.threshold = threshold;
		}
	}

	setSocket(socket) {
		this._ended = false;

		const endSocket = () => {
			if (this._ended) return;
			this._ended = true;
			clearTimeout(this.closeTimer);
			this.socket.removeListener('close', endSocket);
			this.socket.removeListener('end', endSocket);
			this.socket.removeListener('timeout', endSocket);
			this.emit('end', this._endReason || 'SocketClosed');
		};

		this.socket = socket;

		if (this.socket.setNoDelay) this.socket.setNoDelay(true);

		this.socket.on('connect', () => this.emit('connect'));
		this.socket.on('error', (error) => {
			this.emit('error', error);
			this.emit('end');
		});
		this.socket.on('close', endSocket);
		this.socket.on('end', endSocket);
		this.socket.on('timeout', endSocket);
		this.framer.on('error', (error) => this.emit('error', error));
		this.splitter.on('error', (error) => this.emit('error', error));

		this.socket.pipe(this.splitter);
		this.framer.pipe(this.socket);
	}

	setEncryption(sharedSecret) {
		if (this.cipher !== null) this.emit('error', new Error('Set encryption twice!'));
		if (crypto.getCiphers().includes(Constants.Cipher)) {
			this.cipher = crypto.createCipheriv(Constants.Cipher, sharedSecret, sharedSecret);
			this.decipher = crypto.createDecipheriv(Constants.Cipher, sharedSecret, sharedSecret);
		} else {
			this.cipher = new Cipher(sharedSecret);
			this.decipher = new Decipher(sharedSecret);
		}
		this.cipher.on('error', (err) => this.emit('error', err));
		this.decipher.on('error', (err) => this.emit('error', err));

		this.framer.unpipe(this.socket);
		this.framer.pipe(this.cipher).pipe(this.socket);

		this.socket.unpipe(this.splitter);
		this.socket.pipe(this.decipher).pipe(this.splitter);
	}

	setSerializer(state) {
		this.serializer = createSerializer({ isServer: this.isServer, version: this.version, state: state, customPackets: this.customPackets });
		this.deserializer = createDeserializer({ isServer: this.isServer, version: this._version, state, customPackets: this.options.customPackets,	noErrorLogging: this.production	});

		this.splitter.recognizeLegacyPing = state === Constants.ProtocolStates.HANDSHAKING;

		this.serializer.on('error', (error) => {
			let parts;
			if (error.field) {
				parts = error.field.split('.');
				parts.shift();
			} else { parts = []; }
			const serializerDirection = !this.isServer ? 'toServer' : 'toClient';

			error.field = [this.protocolState, serializerDirection].concat(parts).join('.');
			error.message = `Serialization error for ${error.field} : ${error.message}`;

			if (!this.compressor) this.serializer.pipe(this.framer);
			else this.serializer.pipe(this.compressor);
			this.emit('error', error);
		});

		this.deserializer.on('error', (error) => {
			let parts;
			if (error.field) {
				parts = error.field.split('.');
				parts.shift();
			} else { parts = []; }
			const deserializerDirection = this.isServer ? 'toServer' : 'toClient';
			error.field = [this.protocolState, deserializerDirection].concat(parts).join('.');
			error.message = `Deserialization error for ${error.field} : ${error.message}`;
			if (!this.compressor) this.splitter.pipe(this.deserializer);
			else this.decompressor.pipe(this.deserializer);
			this.emit('error', error);
		});

		this.deserializer.on('data', (parsed) => {
			parsed.metadata.name = parsed.data.name;
			parsed.data = parsed.data.params;
			parsed.metadata.state = state;
			debug(`read packet ${state}.${parsed.metadata.name}`);
			if (debug.enabled) {
				const string = JSON.stringify(parsed.data, null, 2);
				debug(string && string.length > 10000 ? parsed.data : string);
			}
			this.emit('packet', parsed.data, parsed.metadata, parsed.buffer);
			this.emit(parsed.metadata.name, parsed.data, parsed.metadata);
			this.emit(`raw.${parsed.metadata.name}`, parsed.buffer, parsed.metadata);
			this.emit('raw', parsed.buffer, parsed.metadata);
		});
	}

	destroy() {
		for (const timeout of this._timeouts) this.clearTimeout(timeout);
		this._timeouts.clear();
	}

	end(reason) {
		this._endReason = reason;
		/* ending the serializer will end the whole chain
        serializer -> framer -> socket -> splitter -> deserializer */
		if (this.serializer) this.serializer.end();
		else if (this.socket) this.socket.end();

		if (this.socket) this.closeTimer = setTimeout(this.socket.destroy.bind(this.socket), 30000);
	}

	write(name, params) {
		if (!this.serializer.writable) { return; }
		debug(`writing packet ${this.state}.${name}`);
		debug(params);
		this.serializer.write({ name, params });
	}

	writeRaw(buffer) {
		const stream = this.compressor === null ? this.framer : this.compressor;
		if (!stream.writable) { return; }
		stream.write(buffer);
	}

	connect() {
		if (this.options.stream) {
			debug('Stream has been set... Using it to connect instead of default...');
			this.setSocket(this.options.stream);
			return this.emit('connect');
		}

		if (this.options.port === 25565 && net.isIP(this.options.host) === 0 && this.options.host !== 'localhost') {
			debug('Preforming SRV Lookup...');
			dns.resolveSrv(`_minecraft._tcp.${this.options.host}`, (err, hostname) => {
				if (err) debug(`SRV Lookup of Host ${this.options.host} returned: ${err}`);
				if (hostname && hostname.length > 0) {
					debug(`SRV Lookup got ${hostname}`);
					this.options.host = hostname[0].name;
					this.options.port = hostname[0].port;
				}
			});
		}

		return this.setSocket(net.connect(this.options.port, this.options.host));
	}

}

module.exports = BaseClient;

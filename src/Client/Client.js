const path = require('path');

const Util = require('../Util/Util');
const BaseClient = require('./BaseClient');

const Constants = require('../Util/Constants');

const MicrosoftAuthentication = require('./MicrosoftAuthentication');
const MojangAuthentication = require('./MojangAuthentication');
const queryServer = require('./QueryServer');

const KeepAlive = require('./KeepAlive');
const LetsPlay = require('./LetsPlay');
const PluginChannels = require('./PluginChannels');
const Compression = require('./Compression');
const YggdrasilServer = require('./YggdrasilServer');

/**
 * The client for handling everything like interacting with other clients. You should be extending this or intiizliaing with new. See {@tutorial GettingStarted} for more information.
 * @extends {BaseClient}
 * @tutorial GettingStarted
 */
class Client extends BaseClient {

	/**
	 * @typedef {BaseClientOptions} ClientOptions
	 * @property {string} [host='localhost'] A hostname or ip pointing to the server you wish to join.
	 * @property {number} [port=25565] The port of the server you wish to connect to.
	 * @property {boolean} [production=false] Whether this server is in production (changes the way this handles errors.)
	 * @property {version} [version=false] Whether to specify a specific version to connect with. False = Auto.
	 * @property {object} [customPackets={}] Custom packets to include.
	 * @property {boolean} [offlineMode=false] Whether or not we are connecting to an offline server. If true, no need for password.
	 * @property {boolean} [keepAlive=true] Whether or not to setup and run the keepAlive ping to the server.
	 * @property {string} [userAgent='Minecraft'] The user agent to pass to Microsoft/Mojang API.
	 * @property {string} [sessionServer='https://sessionserver.mojang.com'] What session server to use when authenticating when attempting to join.
	 */

	/**
	 * Constructs this Client.
	 * @param {ClientOptions} [options = {}] The object configuration to pass to this client.
	 */
	constructor(options = {}) {
		if (!Util.isObject(options)) throw new TypeError('Client must be initiated with an object as a parameter');
		super(options);

		/**
		 * The options the client was initialized with.
		 * @name Client#options
		 * @type {ClientOptions}
		 */
		this.options = Util.mergeDefault(Constants.BaseClient, options);

		/**
		 * The directory where all tokens and other files will be cached.
		 * @since 0.0.1
		 * @type {string}
		 */
		this.baseDirectory = path.dirname(require.main.filename);

		/**
		 * The keep alive handler.
		 * @name Client#keepAlive
		 * @type {KeepAlive}
		 */
		this.keepAlive = new KeepAlive(this);

		/**
		 * Handles when the client is ready and has successfully joined the server.
		 * @name Client#letsPlay
		 * @type {LetsPlay}
		 */
		this.letsPlay = new LetsPlay(this);

		/**
		 * Introduces plugin channels to the client.
		 * @name Client#pluginChannels
		 * @type {PluginChannels}
		 */
		this.pluginChannels = new PluginChannels(this);

		this.compression = new Compression(this);

		this.yggdrasil = new YggdrasilServer(this);


		//
		//

		//
		//

		// Assign ProtocolVersion from Minecraft-Data to ClientOptions
		//
		//
		//
		//
	}

	/**
	 * The entry function to connect your bot to your specific server.
	 * @since 0.0.1
	 * @param {string} [username=this.username] An email or username of a mojang or microsoft account to login with.
	 * @param {string} [password=this.password] A secret password that you use with the respective service to login with.
	 * @returns {Promise<string>} Username of the account used.
	 */
	async login(username = this.username, password = this.password) {
		if (!username || typeof username !== 'string') throw new TypeError('Invalid Username. Username must be a string.');
		// password was not passed or password is not a string aand if offline
		if ((!password || typeof password !== 'string') && !/(microsoft|ms)/i.test(this.options.auth)) {
			if (!this.options.offlineMode) throw new TypeError('Invalid Password, Attempted to login with no password.');
		}

		// Are we auto detecting the server's minecraft version?
		if (this.options.version === false) this.autoVersion = true;

		this.emit('debug', `Provided username: ${username}`);
		this.emit('debug', 'Preforming authentication...');

		if (/(microsoft|ms)/i.test(this.options.auth)) {
			if (this.options.password) await MicrosoftAuthentication.authenticatePassword(this);
			else await MicrosoftAuthentication.authenticateDeviceToken(this);
		} else {
			await MojangAuthentication.authenticate(this);
		}

		if (this.options.version === false) await queryServer(this);


		// Handle Session Server Join Requests and Encryption Things. (encypt.js)
		// figure out something about plugin channels
		// figure out where do we centrally locate minecraft-data

		super.connect();
	}


	async reconnect() {
		if (this.reconnecting || this.status !== 'ready') return false;
		this.reconnecting = true;
		return true;
	}

}

module.exports = Client;

/**
 * Emitted when a minecraft session has been established.
 * @event Client#session
 * @since 0.0.1
 * @param {string}
 */

/**
 * Emited when a client has successfully joined a server.
 * @event Client#success
 * @since 0.0.1
 * @parm {Packet}
 */

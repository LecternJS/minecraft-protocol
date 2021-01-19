const XboxLiveAuth = require('@xboxreplay/xboxlive-auth');
const fetch = require('node');

const path = require('path');
const fs = require('fs');

const Constants = require('../Util/Constants');
const Util = require('../Util/Util');

const MicrosoftTokenManager = require('./MicrosoftTokenManager');
const XboxTokenManager = require('./XboxTokenManager');
const MinecraftTokenManager = require('./MinecraftTokenManager');

const debug = require('debug')('minecraft-protocol:msal');

class MicrosoftAuthFlow {

	constructor(username, cacheDirectory, codeCallback) {
		debug(`Initializing cache...`);
		const hash = Util.hash(username).substr(0, 6);

		this.cachePath = cacheDirectory || Util.cacheLocation;
		try {
			if (!fs.existsSync(`${this.cachePath}/nmp-cache`)) {
				fs.mkdirSync(`${this.cachePath}/nmp-cache`);
			}
			this.cachePath += '/nmp-cache';
		} catch (error) {
			console.error(`Unable to create nmp-cache: ${error}`);
			this.cachePath = __dirname;
		}

		const CacheLocations = {
			msa: path.join(this.cachePath, `./${hash}_msa-cache.json`),
			xbl: path.join(this.cachePath, `./${hash}_xbl-cache.json`),
			mca: path.join(this.cachePath, `./${hash}_mca-cache.json`)
		};

		const scopes = ['XboxLive.signin', 'offline_access'];
		this.msa = new MicrosoftTokenManager(Constants.MSALConfig, scopes, CacheLocations.msa);
		this.xbl = new XboxTokenManager(Constants.XSTSRelyingParty, CacheLocations.xbl);
		this.mca = new MinecraftTokenManager(CacheLocations.mca);

		this.codeCallback = codeCallback;
	}

	async getMsaToken() {
		if (await this.msa.verifyTokens()) {
			return this.msa.getAccessToken().token;
		} else {
			const res = await this.msa.authDeviceToken((response) => {
				console.log('[MSAL] First time logging in. Please authenticate with Microsoft:');
				console.log(response.message);
				// console.log('Data', data)
				if (this.codeCallback) this.codeCallback(response);
			});
			console.log(`[MSAL] Signed in as ${res.account.username}`);
			debug('[msa] got auth result', res);
			return res.accessToken;
		}
	}

	async getXboxToken() {
		if (await this.xbl.verifyTokens()) {
			return this.xbl.getCachedXstsToken().data;
		} else {
			const MSAToken = await this.getMsaToken();
			const UserToken = await this.xbl.getUserToken(MSAToken);
			const XSTS = await this.xbl.getXSTSToken(UserToken);
			return XSTS;
		}
	}

	async getMinecraftToken() {
		if (await this.mca.verifyTokens()) {
			return this.mca.getCachedAccessToken().token;
		} else {
			const xsts = await this.getXboxToken();
			debug('xsts data', xsts);
			return this.mca.getAccessToken(xsts);
		}
	}

}

async function postAuthenticate(client, options, mcAccessToken, msa) {
	options.haveCredentials = mcAccessToken !== null;

	const MinecraftProfile = await fetch(Constants.MinecraftServicesProfile, Constants.NodeFetchOptions).then((res) => {
		if (res.ok) { return res.json(); } else {
			const user = msa ? msa.getUsers()[0] : options.username;
			throw Error(`Failed to obtain Minecraft profile data for '${user.username}', does the account own Minecraft Java? Server returned: ${res.statusText}`);
		}
	});

	if (!MinecraftProfile.id) throw Error('This user does not own minecraft according to minecraft services.');

	// This profile / session here could be simplified down to where it just passes the uuid of the player to encrypt.js
	// That way you could remove some lines of code. It accesses client.session.selectedProfile.id so /shrug.
	// - Kashalls
	const profile = {
		name: MinecraftProfile.name,
		id: MinecraftProfile.id
	};

	const session = {
		accessToken: mcAccessToken,
		selectedProfile: profile,
		availableProfile: [profile]
	};
	client.session = session;
	client.username = MinecraftProfile.name;
	options.accessToken = mcAccessToken;
	client.emit('session', session);
	options.connect(client);
}

/**
   * Authenticates with Mincrosoft through user credentials, then
   * with Xbox Live, Minecraft, checks entitlements and returns profile
   *
   * @function
   * @param {Object} client - The client passed to protocol
   * @param {Object} options - Client Options
   */
async function authenticatePassword(client, options) {
	let XAuthResponse;

	try {
		XAuthResponse = await XboxLiveAuth.authenticate(options.username, options.password, { XSTSRelyingParty: Constants.XSTSRelyingParty })
			.catch((err) => {
				console.warn('Unable to authenticate with Microsoft', err);
				throw err;
			});
	} catch (error) {
		console.log('Retrying auth with device code flow');
		return await authenticateDeviceToken(client, options);
	}

	try {
		const MineServicesResponse = await fetch(Constants.MinecraftServicesLogWithXbox, {
			method: 'post',
			...Constants.NodeFetchOptions,
			body: JSON.stringify({ identityToken: `XBL3.0 x=${XAuthResponse.userHash};${XAuthResponse.XSTSToken}` })
		}).then(Util.checkStatus);

		Constants.NodeFetchOptions.headers.Authorization = `Bearer ${MineServicesResponse.access_token}`;
		const MineEntitlements = await fetch(Constants.MinecraftServicesEntitlement, Constants.NodeFetchOptions).then(Util.checkStatus);
		if (MineEntitlements.items.length === 0) throw Error('This user does not have any items on its accounts according to minecraft services.');

		return await postAuthenticate(client, options, MineServicesResponse.access_token);
	} catch (err) {
		console.error(err);
		return client.emit('error', err);
	}
}

/**
   * Authenticates to Minecraft via device code based Microsoft auth,
   * then connects to the specified server in Client Options
   *
   * @function
   * @param {Object} client - The client passed to protocol
   * @param {Object} options - Client Options
   */
async function authenticateDeviceToken(client, options) {
	try {
		const flow = new MicrosoftAuthFlow(options.username, options.profilesFolder, options.onMsaCode);
		const token = await flow.getMinecraftToken();
		console.log('Acquired Minecraft token', token);

		Constants.NodeFetchOptions.headers.Authorization = `Bearer ${token}`;
		await postAuthenticate(client, options, token, flow.msa);
	} catch (err) {
		console.error(err);
		client.emit('error', err);
	}
}

module.exports = {
	authenticatePassword,
	authenticateDeviceToken
};

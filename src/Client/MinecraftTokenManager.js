const fs = require('fs');
const path = require('path');

const fetch = require('node-fetch');
const debug = require('debug')('minecraft-protocol:msal');

const Constants = require('../Util/Constants');
const Util = require('../Util/Util');

// Manages Minecraft tokens for sessionserver.mojang.com
class MinecraftTokenManager {

	constructor(cacheLocation) {
		this.cacheLocation = cacheLocation || path.join(__dirname, './mca-cache.json');
		try {
			this.cache = require(this.cacheLocation);
		} catch (error) {
			this.cache = {};
		}
	}

	getCachedAccessToken() {
		const token = this.cache.mca;
		// console.log('MC token cache', this.cache)
		if (!token) return;
		const expires = token.obtainedOn + (token.expires_in * 1000);
		const remaining = expires - Date.now();
		const valid = remaining > 1000;
		// eslint-disable-next-line consistent-return
		return { valid, until: expires, token: token.access_token, data: token };
	}

	setCachedAccessToken(data) {
		data.obtainedOn = Date.now();
		this.cache.mca = data;
		fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache));
		// console.log('cached', data, this.cache, this.cacheLocation)
	}

	async verifyTokens() {
		const at = this.getCachedAccessToken();
		if (!at) return false;
		debug('[mc] have user access token', at);
		if (at.valid) return true;
		return false;
	}

	async getAccessToken(xsts) {
		debug('[mc] authing to minecraft', xsts);
		const MineServicesResponse = await fetch(Constants.MinecraftServicesLogWithXbox, {
			method: 'post',
			...Constants.NodeFetchOptions,
			body: JSON.stringify({ identityToken: `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}` })
		}).then(Util.checkStatus);

		debug('[mc] mc auth response', MineServicesResponse);
		this.setCachedAccessToken(MineServicesResponse);
		return MineServicesResponse.access_token;
	}

	async verifyEntitlements() {
		// to be implemented
	}

}

module.exports = MinecraftTokenManager;

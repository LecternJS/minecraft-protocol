const fs = require('fs');
const path = require('path');

const XboxLiveAuth = require('@xboxreplay/xboxlive-auth');
const debug = require('debug')('minecraft-protocol:msal');

// Manages Xbox Live tokens for xboxlive.com
class XboxTokenManager {

	constructor(relayParty, cacheLocation) {
		this.relayParty = relayParty;
		this.cacheLocation = cacheLocation || path.join(__dirname, './xbl-cache.json');
		try {
			this.cache = require(this.cacheLocation);
		} catch (error) {
			this.cache = {};
		}
	}

	getCachedUserToken() {
		const token = this.cache.userToken;
		if (!token) return;
		const valid = (new Date(token.NotAfter) - Date.now()) > 1000;
		// eslint-disable-next-line consistent-return
		return { valid, token: token.Token, data: token };
	}

	getCachedXstsToken() {
		const token = this.cache.xstsToken;
		if (!token) return;
		const valid = (new Date(token.expiresOn) - Date.now()) > 1000;
		// eslint-disable-next-line consistent-return
		return { valid, token: token.XSTSToken, data: token };
	}

	setCachedUserToken(data) {
		this.cache.userToken = data;
		fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache));
	}

	setCachedXstsToken(data) {
		this.cache.xstsToken = data;
		fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache));
	}

	async verifyTokens() {
		const ut = this.getCachedUserToken();
		const xt = this.getCachedXstsToken();
		if (!ut || !xt) {
			return false;
		}
		debug('[xbl] have user, xsts', ut, xt);
		if (ut.valid && xt.valid) {
			return true;
		} else if (ut.valid && !xt.valid) {
			try {
				await this.getXSTSToken(ut.data);
				return true;
			} catch (error) {
				return false;
			}
		}
		return false;
	}

	async getUserToken(msaAccessToken) {
		debug('[xbl] obtaining xbox token with ms token', msaAccessToken);
		if (!msaAccessToken.startsWith('d=')) { msaAccessToken = `d=${msaAccessToken}`; }
		const xblUserToken = await XboxLiveAuth.exchangeRpsTicketForUserToken(msaAccessToken);
		this.setCachedUserToken(xblUserToken);
		debug('[xbl] user token:', xblUserToken);
		return xblUserToken;
	}

	async getXSTSToken(xblUserToken) {
		debug('[xbl] obtaining xsts token with xbox user token', xblUserToken.Token);
		const xsts = await XboxLiveAuth.exchangeUserTokenForXSTSIdentity(xblUserToken.Token, { XSTSRelyingParty: this.relayParty, raw: false });
		this.setCachedXstsToken(xsts);
		debug('[xbl] xsts', xsts);
		return xsts;
	}

}

module.exports = XboxTokenManager;

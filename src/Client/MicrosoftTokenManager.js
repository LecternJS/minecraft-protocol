const fs = require('fs');
const path = require('path');

const msal = require('@azure/msal-node');
const debug = require('debug')('minecraft-protocol:msal');

class MicrosoftTokenManager {

	constructor(msalConfig, scopes, cacheLocation) {
		this.msaClientId = msalConfig.auth.clientId;
		this.scopes = scopes;
		this.cacheLocation = cacheLocation || path.join(__dirname, './msa-cache.json');

		try {
			this.msaCache = require(this.cacheLocation);
		} catch (error) {
			this.msaCache = {};
			fs.writeFileSync(this.cacheLocation, JSON.stringify(this.msaCache));
		}

		const beforeCacheAccess = async (cacheContext) => {
			cacheContext.tokenCache.deserialize(await fs.promises.readFile(this.cacheLocation, 'utf-8'));
		};

		const afterCacheAccess = async (cacheContext) => {
			if (cacheContext.cacheHasChanged) {
				await fs.promises.writeFile(this.cacheLocation, cacheContext.tokenCache.serialize());
			}
		};

		const cachePlugin = {
			beforeCacheAccess,
			afterCacheAccess
		};

		msalConfig.cache = {
			cachePlugin
		};
		this.msalApp = new msal.PublicClientApplication(msalConfig);
		this.msalConfig = msalConfig;
	}

	getUsers() {
		const accounts = this.msaCache.Account;
		const users = [];
		if (!accounts) return users;
		for (const account of Object.values(accounts)) {
			users.push(account);
		}
		return users;
	}

	getAccessToken() {
		const tokens = this.msaCache.AccessToken;
		if (!tokens) return;
		const account = Object.values(tokens).filter((token) => token.client_id === this.msaClientId)[0];
		if (!account) {
			debug('[MSAL] No valid access token found', tokens);
			return;
		}
		const until = new Date(account.expires_on * 1000) - Date.now();
		const valid = until > 1000;
		// eslint-disable-next-line consistent-return
		return { valid, until: until, token: account.secret };
	}

	getRefreshToken() {
		const tokens = this.msaCache.RefreshToken;
		if (!tokens) return;
		const account = Object.values(tokens).filter((token) => token.client_id === this.msaClientId)[0];
		if (!account) {
			debug('[MSAL] No valid refresh token found', tokens);
			return;
		}
		// eslint-disable-next-line consistent-return
		return { token: account.secret };
	}

	async refreshTokens() {
		const rtoken = this.getRefreshToken();
		if (!rtoken) {
			throw new Error('Cannot refresh without refresh token');
		}
		const refreshTokenRequest = {
			refreshToken: rtoken.token,
			scopes: this.scopes
		};

		return new Promise((resolve, reject) => {
			this.msalApp.acquireTokenByRefreshToken(refreshTokenRequest).then((response) => {
				debug('[MSAL] refreshed token', JSON.stringify(response));
				resolve(response);
			}).catch((error) => {
				debug('[MSAL] failed to refresh', JSON.stringify(error));
				reject(error);
			});
		});
	}

	async verifyTokens() {
		const at = this.getAccessToken();
		const rt = this.getRefreshToken();
		if (!at || !rt) {
			return false;
		}
		debug('[msa] have at, rt', at, rt);
		if (at.valid && rt) {
			return true;
		} else {
			try {
				await this.refreshTokens();
				return true;
			} catch (error) {
				return false;
			}
		}
	}

	// Authenticate with device_code flow
	async authDeviceToken(dataCallback) {
		const deviceCodeRequest = {
			deviceCodeCallback: (resp) => {
				debug('[msa] device_code response: ', resp);
				dataCallback(resp);
			},
			scopes: this.scopes
		};

		return new Promise((resolve, reject) => {
			this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest).then((response) => {
				debug('[msa] device_code resp', JSON.stringify(response));
				if (!this.msaCache.Account) this.msaCache.Account = { '': response.account };
				resolve(response);
			}).catch((error) => {
				console.warn('[msa] Error getting device code');
				console.log(JSON.stringify(error));
				reject(error);
			});
		});
	}

}

module.exports = MicrosoftTokenManager;

const Util = require('../Util/Util');
const fs = require('fs');
const path = require('path');

const UUID = require('uuid-1345');
const yggdrasilClient = require('yggdrasil');

class MojangAuthentication {

	constructor(cache) {
		this.cache = cache || Util.cacheLocation || '.';

		try {
			if (!fs.existsSync(`${this.cache}/nmp-cache`)) {
				fs.mkdirSync(`${this.cache}/nmp-cache`);
			}
			this.cache += '/nmp-cache';
		} catch (error) {
			console.log(`Failed to open cache directory: ${error}`);
			this.cache = __dirname;
		}
	}

	async getProfiles() {
		const fileLocation = path.join(this.cache, 'launcher_profiles.json');
		const file = fs.readFileSync(fileLocation);
		return JSON.parse(file);
	}

	async fetchProfile(username) {
		try {
			const LauncherProfiles = await this.getProfiles();
			username = username.toLowerCase();

			return Object.keys(LauncherProfiles.authenticationDatabase).find((key) =>
				LauncherProfiles.authenticationDatabase[key].username.toLowerCase() === username ||
				Object.values(LauncherProfiles.authenticationDatabase[key].profiles)[0].displayName.toLowerCase() === username);
		} catch (error) {
			return false;
		}
	}

	async hasProfile(username) {
		return !!await this.fetchProfile(username);
	}

}

async function authenticatePassword(client, options) {
	const mojang = new MojangAuthentication();
	const yggdrasil = yggdrasilClient({ agent: options.agent, host: options.authServer || 'https://authserver.mojang.com' });
	const clientToken = options.clientToken ||
		(options.session && options.session.clientToken) ||
		(options.profilesFolder && await mojang.getProfiles().clientToken) ||
		UUID.v4().toString().replace(/-/g, '');
	const skipValidation = false || options.skipValidation;
	options.accessToken = null;
	options.haveCredentials = !!options.password ||
		(clientToken !== null && options.session !== null) ||
		(options.profilesFolder && mojang.hasProfile(client.options.host));

	if (!options.session && options.profilesFolder) {
		try {
			const LauncherProfiles = await this.getProfiles();
			const keys = await mojang.fetchProfile(client.options.host);

			const profile = LauncherProfiles.authenticationDatabase[keys];

			if (profile) {
				const newProfile = {
					name: profile.username,
					id: Object.keys(profile.profiles)[0]
				};

				options.session = {
					accessToken: profile.accessToken,
					clientToken: LauncherProfiles.clientToken,
					selectedProfile: newProfile,
					availableProfiles: [newProfile]
				};
				options.username = profile.username;
			}
		// eslint-disable-next-line no-empty
		} catch (error) {}
	}

	if (options.session) {
		if (skipValidation) return this.handleSession(options.session);
		const { accessToken, clientToken } = options.session;
		try {
			await yggdrasil.validate(accessToken);
			return this.handleSession(options.session);
			// eslint-disable-next-line no-empty
		} catch (err) {}

		try {
			const [accessToken] = await yggdrasil.refresh(accessToken, clientInformation);
			return this.handleSession(options.session);
			// eslint-disable-next-line no-empty
		} catch (err) {}

		if (options.username && options.password) {
			try {
				const session = await yggdrasil.auth({ user: options.username, pass: options.password, token: clientToken, requestUser: true });
				return this.handleSession(session);
			} catch (err) {}
		}
	} else {
		yggdrasil.auth({
			user: options.username,
			pass: options.password,
			token: clientToken
		}, this.handleSession);
	}
}

async function handleSession(err, session) {
	if (options.profilesFolder) {
		const mojang = new MojangAuthentication();
		mojang.fetchProfile();
	}
}

async function test() {
	if (!options.haveCredentials) {
		// We do not have any credentials, auth will fail almost immediately.
		client.username = options.username;
	} else {
		const keys = await this.hasProfile();
	}
}

async function validateAccessToken(token) {
	const mojang = new MojangAuthentication();
}


module.exports = authenticatePassword;

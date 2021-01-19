const UUID = require('uuid-1345');
const yggdrasil = require('yggdrasil');
const fs = require('fs').promises;
const path = require('path');

const Constants = require('../Util/Constants');
const Util = require('../Util/Util');

class MojangAuthentication {

	constructor(client, options) {
		this.yggdrasil = yggdrasil({ agent: options.agent, host: options.authServer || Constants.au });
		this.client = client;
		this.options = options;
	}

	async profiles() {
		try {
			return JSON.parse(await fs.readFile(path.join(this.cacheDirectory, 'launcher_profiles.json'), 'utf-8'));
		} catch (err) {
			await fs.mkdir(this.options.profilesFolder, { recursive: true });
			await fs.writeFile(path.join(this.options.profilesFolder, 'launcher_profiles.json'), '{}');
			return { authenticationDatabase: {} };
		}
	}

	async profileCredenitials() {
		try {
			const auths = await this.profiles();

			const lowerUsername = this.options.username.toLowerCase();
			return !!Object.keys(auths.authenticationDatabase).find(key =>
				auths.authenticationDatabase[key].username.toLowerCase() === lowerUsername ||
                Object.values(auths.authenticationDatabase[key].profiles)[0].displayName.toLowerCase() === lowerUsername
			);
		} catch (err) {
			return false;
		}
	}

	async authenticate() {
        if ()
	}

}

module.exports = MojangAuthentication;

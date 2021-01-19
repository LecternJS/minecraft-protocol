const ping = require('./Ping');

const minecraftData = require('minecraft-data');
const Constants = require('../Util/Constants');

async function queryServer(client) {
	// We do not want our client to connect because we do not know what version the server is.
	client.pinging = true;

	client.emit('debug', `Querying Server: ${client.options.host}`);

	const response = await ping(client.options, (error, res) => {
		if (error) return client.emit('error', error);
		this.emit(`Ping result: ${res}`);
		return res;
	});

	this.emit('debug', `Server Description:\n${response.description}`);

	const { name, protocol } = response.version;
	const logicalGuess = [name]
		.concat(name.match(/((\d+\.)+\d+)/g) || [])
		.map((version) => minecraftData.versionsByMinecraftVersion.pc[version])
		.filter((info) => info)
		.sort((a, b) => b.version - a.version);
	const [version] = (minecraftData.postNettyVersionsByProtocolVersion.pc[protocol] || []).concat(logicalGuess);
	this.emit('debug', `Detected version: ${version}`);
	if (!version) client.emit('error', new Error(`unsupported/unknown protocol version: ${protocol}, update minecraft-data`));

	const { minecraftVersion } = version;
	this.emit('debug', `Server Version: ${minecraftVersion}, Protocol Version: ${protocol}`);

	client.version = minecraftVersion;
	client.state = Constants.ProtocolStates.HANDSHAKING;

	if (client.autoVersionHooks) client.autoVersionHooks.forEach((hook) => hook(response, client, client.options));

	client.pinging = false;
	client.emit('ping-finished');
	return client;
}

module.exports = queryServer;

const BaseClient = require('./BaseClient');
const Constants = require('../Util/Constants');
const Util = require('../Util/Util');

let timer = null;

const Defaults = {
	host: 'localhost',
	port: 25565,
	version: Constants.DefaultMinecraftVersion,
	timeout: 120000,
	noResponseTimeout: 5000
};

async function ping(options, callback) {
	options = Util.mergeDefault(Defaults, options);

	const minecraftData = require('minecraft-data')(options.version);
	if (!minecraftData) throw Error('Invalid Minecraft Version. Either unsupported or non-existant.');

	const client = new BaseClient(options);
	client.on('error', (error) => {
		clearTimeout(timer);
		return callback(error);
	});

	client.on('state', (state) => {
		if (state === Constants.ProtocolStates.STATUS) client.write('ping_start', {});
	});

	client.on('connect', () => {
		client.write('set_protocol', {
			protocolVersion: minecraftData.version.version,
			serverHost: options.host,
			serverPort: options.port,
			nextState: 1
		});
		client.state = Constants.ProtocolStates.STATUS;
	});


	client.once('server_info', (packet) => {
		const data = JSON.parse(packet.response);
		const start = Date.now();
		const maxTime = setTimeout(() => {
			clearTimeout(timer);
			client.end();
			return callback(null, data);
		}, options.noPongTimeout);
		client.once('ping', () => {
			data.latency = Date.now() - start;
			clearTimeout(maxTime);
			clearTimeout(timer);
			client.end();
			return callback(null, data);
		});
		client.write('ping', { time: [0, 0] });
	});

	timer = setTimeout(() => {
		client.end();
		return callback(new Error('ETIMEDOUT'));
	}, options.timeout);

	client.connect();
}

module.exports = ping;

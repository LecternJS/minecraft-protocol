'use strict';

const ServerDefaults = {
	'online-mode': true,
	host: undefined,
	port: 25565,
	motd: 'A Minecraft Server',
	maxPlayers: 20,
	version: require('./Versions').defaultVersion,
	favicon: null,
	customPackets: {},
	kickTimeout: 30000,
	checkTimeoutInterval: 4000,
	keepAlive: true
};

module.exports = ServerDefaults;

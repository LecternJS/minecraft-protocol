'use strict';

const Util = require('./Util/Util');

module.exports = {
	// "Root" Classes (entry points);
	BaseClient: require('./Client/BaseClient'),
	Client: require('./Client/Client'),

	BaseServer: require('./Server/BaseServer'),
	Server: require('./Server/Server'),

	MicrosoftAuthentication: require('./Client/MicrosoftAuthentication'),
	MicrosoftTokenManager: require('./Client/MicrosoftTokenManager'),
	MinecraftTokenManger: require('./Client/MinecraftTokenManager'),
	XboxTokenManager: require('./Client/XboxTokenManager'),
	MojangAuthentication: require('./Client/MojangAuthentication'),

	// Utilities
	Cipher: require('./Util/Cipher'),
	Decipher: require('./Util/Decipher'),
	Compressor: require('./Util/Compressor'),
	Decompressor: require('./Util/Decompressor'),
	Serializer: require('./Util/Serializer'),
	Deserializer: require('./Util/Deserializer'),
	Framer: require('./Util/Framer'),
	Splitter: require('./Util/Splitter'),
	ProtocolHandler: require('./Util/ProtocolHandler'),
	Ping: require('./Client/Ping'),
	QueryServer: require('./Client/QueryServer'),
	Util: Util
};

const FullPacketParser = require('protodef');
const manageProtocols = require('./ProtocolHandler');
const Constants = require('./Constants');

function createDeserializer({ state = Constants.States.Handshaking, isServer = false, version = Constants.DefaultMinecraftVersion, customPackets = {}, compiled = true, noErrorLogging = false } = {}) {
	return new FullPacketParser(manageProtocols(state, isServer ? 'toServer' : 'toClient', version, customPackets, compiled), 'packet', noErrorLogging);
}

module.exports = createDeserializer;

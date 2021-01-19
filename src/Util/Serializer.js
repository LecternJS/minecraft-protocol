const { Serializer } = require('protodef');

const manageProtocols = require('./ProtocolHandler');
const Constants = require('./Constants');

function createSerializer(state = Constants.States.Handshaking, isServer = false, version = Constants.DefaultMinecraftVersion, customPackets = {}, compiled = true) {
	return new Serializer(manageProtocols(state, !isServer ? 'toServer' : 'toClient', version, customPackets, compiled), 'packet');
}

module.exports = createSerializer;

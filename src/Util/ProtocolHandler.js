const FullPacketParser = require('protodef');
const merge = require('lodash.merge');
const get = require('lodash.get');

const Minecraft = require('./DataTypes/minecraft');

const protocols = {};


function createProtocol(state, direction, version, customPackets, compiled = true) {
	const key = `${state};${direction};${version}${compiled ? ';c' : ''}`;
	if (protocols[key]) return protocols[key];
	const mcData = require('minecraft-data')(version);
	if (mcData === null) {
		throw new Error(`No data available for version ${JSON.stringify(version)}`);
	}

	if (compiled) {
		const compiler = new FullPacketParser.Compiler.ProtoDefCompiler();
		compiler.addTypes(require('./DataTypes/Compiler-Minecraft'));
		compiler.addProtocol(merge(mcData.protocol, get(customPackets, [mcData.version.majorVersion])), [state, direction]);
		const proto = compiler.compileProtoDefSync();
		protocols[key] = proto;
		return proto;
	}

	const proto = new FullPacketParser.ProtoDef(false);
	proto.addTypes(Minecraft);
	proto.addProtocol(merge(mcData.protocol, get(customPackets, [mcData.version.majorVersion])), [state, direction]);
	protocols[key] = proto;
	return proto;
}

module.exports = createProtocol;

const { ProtoDef } = require('protodef');
const Minecraft = require('../Util/DataTypes/minecraft');

class PluginChannels {

	constructor(client) {
		this.client = client;

		const mcdata = require('minecraft-data')(this.options.version);

		this.channels = [];

		this.proto = new ProtoDef();
		this.proto.addTypes(mcdata.protocol.types);
		this.proto.addTypes(Minecraft);
		this.proto.addTypes('registerarr', [readDumbArr, writeDumbArr, sizeOfDumbArr]);

		this.client.registerChannel = this.registerChannel;
		this.client.unregisterChannel = this.unregisterChannel;
		this.client.writeChannel = this.writeChannel;

		// 1.13-pre3 (385) added Added Login Plugin Message (https://wiki.vg/Protocol_History#1.13-pre3)
		if (this.client.options.protocolVersion >= 385) {
			this.client.on('login_plugin_request', (packet) => this.client.write('login_plugin_response', { messageId: packet.messageId }));
		}
	}

	registerChannel(name, parser, custom) {
		if (custom) this.writeChannel('REGISTER', name);
		if (parser) this.proto.addType(name, parser);
		this.channels.push(name);
		if (this.channels.length === 1) this.client.on('custom_payload', this.onCustomPayload);
	}

	unregisterChannel(channel, custom) {
		if (custom) this.client.writeChannel('UNREGISTER', channel);
		const index = this.channels.find((name) => channel === name);
		if (index) {
			this.proto.types[channel] = undefined;
			this.channels.splice(index, 1);
			if (this.channels.length === 0) this.client.removeListener('custom_payload', this.onCustomPayload);
		}
	}

	writeChannel(channel, params) {
		this.client.emit('debug', `write custom payload ${channel} ${params}`);
		this.client.write('custom_payload', {
			channel: channel,
			data: this.proto.createPacketBuffer(channel, params)
		});
	}

	onCustomPayload(packet) {
		const channel = this.channels.find((chnl) => chnl === packet.channel);
		if (channel) {
			if (this.proto.types[channel]) packet.data = this.proto.parsePacketBuffer(channel, packet.data).data;
			this.client.emit('debug', `read custom payload ${channel} ${packet.data}`);
			this.client.emit(channel, packet.data);
		}
	}

}

module.exports = PluginChannels;

function readDumbArr(buf, offset) {
	const ret = { value: [], size: 0 };
	let results;
	while (offset < buf.length) {
		if (buf.indexOf(0x0, offset) === -1) results = this.read(buf, offset, 'restBuffer', {});
		else results = this.read(buf, offset, 'cstring', {});
		ret.size += results.size;
		ret.value.push(results.value.toString());
		offset += results.size;
	}
	return ret;
}

function writeDumbArr(value, buf, offset) {
	// We need to figure out how to remove the trailing \0
	value.forEach((val) => {
		offset += this.write(val, buf, offset, 'cstring', {});
	});
	return offset;
}

function sizeOfDumbArr(value) {
	return value.reduce((acc, val) => acc + this.sizeOf(val, 'cstring', {}), 0);
}


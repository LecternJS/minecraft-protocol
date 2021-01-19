const Constants = require('../Util/Constants');

class LetsPlay {

	constructor(client) {
		this.client = client;

		this.client.once('success');
		this.client.on('connect', this.connect);
	}

	success(packet) {
		this.client.state = Constants.ProtocolStates.PLAY;
		this.client.uuid = packet.uuid;
		this.client.username = packet.username;
	}

	connect() {
		if (this.client.pinging) {
			this.client.on('connect_allowed', this.handleProtocol);
		} else {
			this.handleProtocol();
		}
	}

	handleProtocol() {
		const taggedHost = this.client.tagHost ? this.client.taggedHost += this.client.tagHost : this.client.options.host;
		this.client.write('set_protocol', {
			protocolVersion: this.client.options.protocolVersion,
			serverHost: taggedHost,
			serverPort: this.client.options.port,
			nextState: 2
		});
		this.client.state = Constants.ProtocolStates.LOGIN;
		this.client.write('login_start', {
			username: this.client.username
		});
	}

	disconnect(message) {
		if (!message.reason) return;
		message = JSON.parse(message.reason);
		let text = message.text ? message.text : message;
		let versionRequired;

		if (text.translate && text.translate.startsWith('multiplayer.disconnect.outdated_')) {
			[versionRequired] = text.with;
		} else {
			if (text.extra) [[text]] = text.extra;
			versionRequired = /(?:Outdated client! Please use|Outdated server! I'm still on) (.+)/.exec(text);
			versionRequired = versionRequired ? versionRequired[1] : null;
		}

		if (!versionRequired) { return; }
		this.end();
		this.emit('error', new Error(`This server is version ${versionRequired
		}, you are using version ${this.version}, please specify the correct version in the options.`));
	}

}

module.exports = LetsPlay;

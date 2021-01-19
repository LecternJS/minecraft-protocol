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

}

module.exports = LetsPlay;

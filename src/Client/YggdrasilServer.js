const crypto = require('crypto');
const yggdrasil = require('yggdrasil');

class YggdrasilServer {

	constructor(client) {
		this.client = client;
		this.server = yggdrasil.server({ agent: this.client.options.agent, host: this.client.options.sessionServer });
		this.client.once('encryption_begin', this.beginEncryption);
	}

	beginEncryption(packet) {
		const secret = this.generateSecret();
		if (this.client.options.haveCredentials) {
			this.server.join(this.options.accessToken, this.client.session.selectedProfile.id, packet.serverId, secret, packet.publicKey, (error) => {
				if (error) {
					this.client.emit('error', error);
					this.client.end();
				} else {
					this.sendEncryptedResponse(packet, secret);
				}
			});
		} else {
			if (packet.serverId !== '-') this.emit('debug', 'This server appears to be an online server and you are not providing any means of authentication, this is going to fail');
			this.sendEncryptedResponse(packet, secret);
		}
	}

	sendEncryptedResponse(packet, secret) {
		const key = convertMCPubToPem(packet.publicKey);
		this.client.write('encryption_begin', {
			sharedSecret: crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, secret),
			verifyToken: crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, packet.verifyToken)
		});
		this.client.setEncryption(secret);
	}

	generateSecret() {
		return crypto.randomBytes(16);
	}

}

module.exports = YggdrasilServer;

function convertMCPubToPem(MCPubKeyBuffer) {
	let pem = '-----BEGIN PUBLIC KEY-----\n';
	let base64PubKey = MCPubKeyBuffer.toString('base64');
	const maxLineLength = 65;
	while (base64PubKey.length > 0) {
		pem += `${base64PubKey.substring(0, maxLineLength)}\n`;
		base64PubKey = base64PubKey.substring(maxLineLength);
	}
	pem += '-----END PUBLIC KEY-----\n';
	return pem;
}

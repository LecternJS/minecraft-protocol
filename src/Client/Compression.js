class Compression {

	constructor(client) {
		this.client = client;

		this.client.once('compress', this.compress);
		this.client.on('set_compression', this.compress);
	}

	compress(packet) {
		this.client.compressionThreshold = packet.threshold;
	}

}

module.exports = Compression;

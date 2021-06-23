class Compression {

	constructor(client) {
		this.client = client;

		this.client.once('compress', this.compress.bind(this));
		this.client.on('set_compression', this.compress.bind(this));
	}

	compress(packet) {
		this.client.compressionThreshold = packet.threshold;
	}

}

module.exports = Compression;

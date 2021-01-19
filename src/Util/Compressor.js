const { types: { varint: [writeVarInt, sizeOfVarInt] } } = require('protodef');
const zlib = require('zlib');
const { Transform } = require('readable-stream');

class Compressor extends Transform {

	constructor(compressionThreshold = -1) {
		super();
		this.compressionThreshold = compressionThreshold;
	}

	_transform(chunk, encoding, callback) {
		if (chunk.length >= this.compressionThreshold) {
			const nChunk = zlib.deflate(chunk, (err, newChunk) => {
				if (err) return callback(err);
				return newChunk;
			});
			const buf = Buffer.alloc(sizeOfVarInt(chunk.length) + nChunk.length);
			const offset = writeVarInt(chunk.length, buf, 0);
			nChunk.copy(buf, offset);
			this.push(buf);
			return callback();
		} else {
			const buf = Buffer.alloc(sizeOfVarInt(0) + chunk.length);
			const offset = writeVarInt(0, buf, 0);
			chunk.copy(buf, offset);
			this.push(buf);
			return callback();
		}
	}

}

module.exports = Compressor;

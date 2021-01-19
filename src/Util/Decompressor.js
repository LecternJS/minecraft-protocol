const zlib = require('zlib');
const { types: { varint: [readVarInt] } } = require('protodef');
const { Transform } = require('readable-stream');

class Decompressor extends Transform {

	constructor(compressionThreshold = -1, hideErrors = false) {
		super();
		this.compressionThreshold = compressionThreshold;
		this.hideErrors = hideErrors;
	}

	_transform(chunk, encoding, callback) {
		const { size, value, error } = readVarInt(chunk, 0);
		if (error) return callback(error);
		if (value === 0) {
			this.push(chunk.slice(size));
			return callback();
		} else {
			const buffer = zlib.unzip(chunk.slice(size), { finishFlush: 2 }, (err, newBuf) => {
				if (err) {
					if (!this.hideErrors) {
						console.error('problem inflating chunk');
						console.error(`uncompressed length ${value}`);
						console.error(`compressed length ${chunk.length}`);
						console.error(`hex ${chunk.toString('hex')}`);
						console.log(err);
					}
					return callback();
				}
				return newBuf;
			});

			if (buffer.length !== value && !this.hideErrors) {
				console.error(`uncompressed length should be ${value} but is ${buffer.length}`);
			}
			this.push(buffer);
			return callback();
		}
	}

}

module.exports = Decompressor;

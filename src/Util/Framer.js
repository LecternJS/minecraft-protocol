const { types: { varint: [writeVarInt, sizeOfVarInt] } } = require('protodef');
const { Transform } = require('readable-stream');

/**
 * Manages the framing of packets.
 * @extends Transform
 */

class Framer extends Transform {

	_transform(chunk, encoding, callback) {
		const varIntSize = sizeOfVarInt(chunk.length);
		const buffer = Buffer.alloc(varIntSize + chunk.length);
		writeVarInt(chunk.length, buffer, 0);
		chunk.copy(buffer, varIntSize);
		this.push(buffer);
		return callback();
	}

}

module.exports = Framer;

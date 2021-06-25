const { Transform } = require('readable-stream');
const { ModeOfOperation } = require('aes-js');

class Decipher extends Transform {

	constructor(secret) {
		super();
		// eslint-disable-next-line new-cap
		this.aes = new ModeOfOperation.cfb(secret, secret, 1);
	}

	_transform(chunk, enc, cb) {
		try {
			const res = this.aes.decrypt(chunk);
			return cb(null, res);
		} catch (error) {
			return cb(error);
		}
	}

}

module.exports = Decipher;

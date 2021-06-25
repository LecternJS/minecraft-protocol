const { Transform } = require('readable-stream');
const aesjs = require('aes-js');

class Cipher extends Transform {

	constructor(secret) {
		super();
		this.aes = new aesjs.ModeOfOperation.cfb(secret, secret, 1); // eslint-disable-line new-cap
	}

	_transform(chunk, enc, cb) {
		try {
			const res = this.aes.encrypt(chunk);
			return cb(null, res);
		} catch (error) {
			return cb(error);
		}
	}

}

module.exports = Cipher;

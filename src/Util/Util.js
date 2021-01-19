const path = require('path');
const os = require('os');
const crypto = require('crypto');

class Util {

	constructor() {
		throw new Error('This class must not be intitated with new.');
	}

	/**
     * Verify if the input is an object.
     * @param {Object} input The object to verify.
     * @returns {boolean}
     */

	static isObject(input) {
		return input && input.constructor === Object;
	}

	/**
     * Sets default properties on an object that aren't already specified.
     * @param {Object} def Default properties.
     * @param {Object} given Object to assign defaults to.
     * @returns {Object}
     */

	static mergeDefault(def, given) {
		if (!given) return Util.deepClone(def);
		for (const key in def) {
			if (typeof given[key] === 'undefined') given[key] = Util.deepClone(def[key]);
			else if (Util.isObject(given[key])) given[key] = Util.mergeDefault(def[key], given[key]);
		}

		return given;
	}

	/**
     * Deep clone.
     * @param {*} source The object to clone.
     * @returns {*}
     */
	static deepClone(source) {
		// Check if it's a primitive (with exception of function and null, which is typeof object)
		if (source === null || Util.isPrimitive(source)) return source;
		if (Array.isArray(source)) {
			const output = [];
			for (const value of source) output.push(Util.deepClone(value));
			return output;
		}
		if (Util.isObject(source)) {
			const output = {};
			for (const [key, value] of Object.entries(source)) output[key] = Util.deepClone(value);
			return output;
		}
		if (source instanceof Map) {
			const output = new source.constructor();
			for (const [key, value] of source.entries()) output.set(key, Util.deepClone(value));
			return output;
		}
		if (source instanceof Set) {
			const output = new source.constructor();
			for (const value of source.values()) output.add(Util.deepClone(value));
			return output;
		}
		return source;
	}

	static isPrimitive(value) {
		return Util.PRIMITIVE_TYPES.includes(typeof value);
	}

	// Credit to https://github.com/simonmeusel/minecraft-folder-path
	get cacheLocation() {
		const OperatingSystem = os.type();
		if (OperatingSystem === 'Darwin') return path.join(os.homedir(), '/Library/Application Support/minecraft');
		// eslint-disable-next-line no-process-env
		if (OperatingSystem === 'win32' || OperatingSystem === 'Windows_NT') return path.join(process.env.APPDATA, '.minecraft');
		return path.join(os.homedir(), '.minecraft');
	}

	static hash(data) {
		return crypto.createHash('sha1').update(data || '', 'binary').digest('hex');
	}

	static checkStatus(res) {
		// res.status >= 200 && res.status < 300
		if (res.ok) {
			return res.json();
		} else {
			throw Error(res.statusText);
		}
	}

	static convertPublicKeyToPEM(buffer) {
		let pem = '-----BEGIN PUBLIC KEY-----\n';
		let base64PubKey = buffer.toString('base64');
		const maxLineLength = 65;
		while (base64PubKey.length > 0) {
			pem += `${base64PubKey.substring(0, maxLineLength)}\n`;
			base64PubKey = base64PubKey.substring(maxLineLength);
		}
		pem += '-----END PUBLIC KEY-----\n';
		return pem;
	}


}

module.exports = Util;

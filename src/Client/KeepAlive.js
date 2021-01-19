class KeepAlive {

	constructor(client) {
		/**
         * The client this was created with.
         * @since 1.0.0
         * @name KeepAlive#client
         * @type {Client}
         */
		this.client = client;

		/**
         * Whether or not this class is enabled or not.
         * @since 1.0.0
         * @name KeepAlive#enabled
         * @type {Boolean}
         */
		this.enabled = this.client.options.keepalive.enabled;

		/**
         * The timeout function for keepalive.
         * @since 1.0.0
         * @name KeepAlive#timeout
         * @type {Function}
         */
		this.timeout = null;

		this.client.on('keep_alive', this.keepalive);
		this.client.on('end', clearTimeout(this.timeout));
	}

	/**
     * The handler for registering and writing the keep alive packet.
     * @param {buffer} packet Keep Alive Packet
     */

	keepalive(packet) {
		if (!this.enabled) return;
		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = setTimeout(() => this.client.end(), this.client.options.keepalive.interval);
		this.client.write('keep_alive', { keepAliveId: packet.keepAliveId });
	}

}

module.exports = KeepAlive;

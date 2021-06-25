/* eslint-env mocha */

const ITERATIONS = 10000;

const mc = require('../src');
const { States } = mc;

const testDataWrite = [
	{ name: 'keep_alive', params: { keepAliveId: 957759560 } },
	{ name: 'chat', params: { message: '<Bob> Hello World!' } },
	// eslint-disable-next-line id-length
	{ name: 'position_look', params: { x: 6.5, y: 65.62, stance: 67.24, z: 7.5, yaw: 0, pitch: 0, onGround: true } }
	// eslint-disable-next-line no-warning-comments
	// TODO: add more packets for better quality data
];

for (const supportedVersion of mc.SupportedVersions) {
	const mcData = require('minecraft-data')(supportedVersion);
	const { version } = mcData;
	describe(`benchmark ${version.minecraftVersion}`, function doThis() {
		this.timeout(60 * 1000);
		const inputData = [];
		it('bench serializing', (done) => {
			const serializer = new mc.Serializer({ state: States.PLAY, isServer: false, version: version.minecraftVersion });
			let i, j;
			console.log('Beginning write test');
			const start = Date.now();
			for (i = 0; i < ITERATIONS; i++) {
				for (j = 0; j < testDataWrite.length; j++) {
					inputData.push(serializer.createPacketBuffer(testDataWrite[j]));
				}
			}
			const result = (Date.now() - start) / 1000;
			console.log(`Finished write test in ${result} seconds`);
			done();
		});

		it('bench parsing', (done) => {
			const deserializer = new mc.Deserializer({ state: States.PLAY, isServer: true, version: version.minecraftVersion });
			console.log('Beginning read test');
			const start = Date.now();
			for (let j = 0; j < inputData.length; j++) {
				deserializer.parsePacketBuffer(inputData[j]);
			}
			console.log(`Finished read test in ${(Date.now() - start) / 1000} seconds`);
			done();
		});
	});
}

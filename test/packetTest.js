/* eslint-disable camelcase */
/* eslint-disable id-length */
/* eslint-env mocha */

const mc = require('../src');
const { Client } = mc;
const { Server } = mc;
const net = require('net');
const assert = require('power-assert');
const { getFieldInfo } = require('protodef').utils;
const { getField } = require('protodef').utils;

function evalCount(count, fields) {
	if (fields[count.field] in count.map) { return count.map[fields[count.field]]; }
	return count.default;
}

const slotValue = {
	present: true,
	blockId: 5,
	itemCount: 56,
	itemDamage: 2,
	nbtData: {
		type: 'compound',
		name: 'test',
		value: {
			test1: { type: 'int', value: 4 },
			test2: { type: 'long', value: [12, 42] },
			test3: { type: 'byteArray', value: [32] },
			test4: { type: 'string', value: 'ohi' },
			test5: { type: 'list', value: { type: 'int', value: [4] } },
			test6: { type: 'compound', value: { test: { type: 'int', value: 4 } } },
			test7: { type: 'intArray', value: [12, 42] }
		}
	}
};

const values = {
	i32: 123456,
	i16: -123,
	u16: 123,
	varint: 1,
	i8: -10,
	u8: 8,
	string: 'hi hi this is my client string',
	buffer: Buffer.alloc(8),
	array: (typeArgs, context) => {
		let count;
		if (typeof typeArgs.count === 'number') {
			// eslint-disable-next-line prefer-destructuring
			count = typeArgs.count;
		} else if (typeof typeArgs.count === 'object') {
			count = evalCount(typeArgs.count, context);
		} else if (typeArgs.count !== undefined) {
			count = getField(typeArgs.count, context);
		} else if (typeArgs.countType !== undefined) {
			count = 1;
		}
		const arr = [];
		while (count > 0) {
			arr.push(getValue(typeArgs.type, context));
			count--;
		}
		return arr;
	},
	container: (typeArgs, context) => {
		const results = {
			'..': context
		};
		Object.keys(typeArgs).forEach((index) => {
			const vaLue = typeArgs[index].name === 'type' && typeArgs[index].type === 'string' && typeArgs[2] !== undefined &&
      typeArgs[2].type !== undefined ?
				typeArgs[2].type[1].fields['minecraft:crafting_shapeless'] === undefined ? 'crafting_shapeless' : 'minecraft:crafting_shapeless' :
				getValue(typeArgs[index].type, results);
			if (typeArgs[index].anon) {
				Object.keys(vaLue).forEach(key => {
					results[key] = vaLue[key];
				});
			} else {
				results[typeArgs[index].name] = vaLue;
			}
		});
		delete results['..'];
		return results;
	},
	// eslint-disable-next-line no-warning-comments
	// TODO : might want to set this to a correct value
	count: 1,
	bool: true,
	f64: 99999.2222,
	f32: -333.444,
	slot: slotValue,
	nbt: {
		type: 'compound',
		name: 'test',
		value: {
			test1: { type: 'int', value: 4 },
			test2: { type: 'long', value: [12, 42] },
			test3: { type: 'byteArray', value: [32] },
			test4: { type: 'string', value: 'ohi' },
			test5: { type: 'list', value: { type: 'int', value: [4] } },
			test6: { type: 'compound', value: { test: { type: 'int', value: 4 } } },
			test7: { type: 'intArray', value: [12, 42] }
		}
	},
	optionalNbt: {
		type: 'compound',
		name: 'test',
		value: {
			test1: { type: 'int', value: 4 },
			test2: { type: 'long', value: [12, 42] },
			test3: { type: 'byteArray', value: [32] },
			test4: { type: 'string', value: 'ohi' },
			test5: { type: 'list', value: { type: 'int', value: [4] } },
			test6: { type: 'compound', value: { test: { type: 'int', value: 4 } } },
			test7: { type: 'intArray', value: [12, 42] }
		}
	},
	compressedNbt: {
		type: 'compound',
		name: 'test',
		value: {
			test1: { type: 'int', value: 4 },
			test2: { type: 'long', value: [12, 42] },
			test3: { type: 'byteArray', value: [32] },
			test4: { type: 'string', value: 'ohi' },
			test5: { type: 'list', value: { type: 'int', value: [4] } },
			test6: { type: 'compound', value: { test: { type: 'int', value: 4 } } },
			test7: { type: 'intArray', value: [12, 42] }
		}
	},
	i64: [0, 1],
	u64: [0, 1],
	entityMetadata: [
		{ key: 17, value: 0, type: 0 }
	],
	topBitSetTerminatedArray: [
		{
			slot: 0,
			item: slotValue
		},
		{
			slot: 1,
			item: slotValue
		}
	],
	objectData: {
		intField: 9,
		velocityX: 1,
		velocityY: 2,
		velocityZ: 3
	},
	UUID: '00112233-4455-6677-8899-aabbccddeeff',
	position: { x: 12, y: 100, z: 4382821 },
	position_ibi: { x: 12, y: 100, z: 4382821 },
	position_isi: { x: 12, y: 100, z: 4382821 },
	position_iii: { x: 12, y: 100, z: 4382821 },
	restBuffer: Buffer.alloc(0),
	switch: (typeArgs, context) => {
		const i = typeArgs.fields[getField(typeArgs.compareTo, context)];
		if (i === undefined) {
			if (typeArgs.default === undefined) {
				throw new Error(`couldn't find the field ${typeArgs.compareTo
				} of the compareTo and the default is not defined`);
			}
			return getValue(typeArgs.default, context);
		} else { return getValue(i, context); }
	},
	option: (typeArgs, context) => getValue(typeArgs, context),
	bitfield: (typeArgs) => {
		const results = {};
		Object.keys(typeArgs).forEach((index) => {
			results[typeArgs[index].name] = 1;
		});
		return results;
	},
	tags: [{ tagName: 'hi', entries: [1, 2, 3, 4, 5] }],
	ingredient: [slotValue],
	particleData: null
};

function getValue(_type, packet) {
	const fieldInfo = getFieldInfo(_type);
	if (typeof values[fieldInfo.type] === 'function') {
		return values[fieldInfo.type](fieldInfo.typeArgs, packet);
	} else if (values[fieldInfo.type] !== undefined) {
		return values[fieldInfo.type];
	} else if (fieldInfo.type !== 'void') {
		throw new Error(`No value for type ${fieldInfo.type}`);
	}
	return fieldInfo;
}

for (const supportedVersion of mc.SupportedVersions) {
	const PORT = Math.round(30000 + (Math.random() * 20000));
	const mcData = require('minecraft-data')(supportedVersion);
	const { version } = mcData;
	const packets = mcData.protocol;

	describe(`packets ${version.minecraftVersion}`, () => {
		let client, server, serverClient;
		before((done) => {
			server = new Server(version.minecraftVersion);
			server.once('listening', () => {
				server.once('connection', (c) => {
					serverClient = c;
					done();
				});
				client = new Client(false, version.minecraftVersion);
				client.setSocket(net.connect(PORT, 'localhost'));
			});
			server.listen(PORT, 'localhost');
		});
		after((done) => {
			client.on('end', () => {
				server.on('close', done);
				server.close();
			});
			client.end();
		});
		let packetInfo;
		Object.keys(packets).filter((state) => state !== 'types')
			.forEach((state) => {
				Object.keys(packets[state]).forEach((direction) => {
					Object.keys(packets[state][direction].types)
						.filter((packetName) => packetName !== 'packet' &&
              packetName.startsWith('packet_'))
						.forEach((packetName) => {
							packetInfo = packets[state][direction].types[packetName];
							packetInfo = packetInfo || null;
							it(`${state},${direction === 'toServer' ? 'Server' : 'Client'}Bound,${packetName}`,
								callTestPacket(packetName.substr(7), packetInfo, state, direction === 'toServer'));
						});
				});
			});
		function callTestPacket(packetName, packetTestInfo, state, toServer) {
			return (done) => {
				client.state = state;
				serverClient.state = state;
				testPacket(packetName, packetTestInfo, state, toServer, done);
			};
		}

		function testPacket(packetName, packetTestInfo, state, toServer, done) {
			// empty object uses default values
			const packet = getValue(packetTestInfo, {});
			if (toServer) {
				serverClient.once(packetName, (receivedPacket) => {
					try {
						assertPacketsMatch(packet, receivedPacket);
					} catch (e) {
						console.log(packet, receivedPacket);
						throw e;
					}
					done();
				});
				client.write(packetName, packet);
			} else {
				client.once(packetName, (receivedPacket) => {
					assertPacketsMatch(packet, receivedPacket);
					done();
				});
				serverClient.write(packetName, packet);
			}
		}

		function assertPacketsMatch(p1, p2) {
			packetInfo.forEach((field) => {
				assert.deepEqual(p1[field], p2[field]);
			});
			Object.keys(p1).forEach((field) => {
				if (p1[field] !== undefined) {
					assert.ok(field in p2, `field ${field
					} missing in p2, in p1 it has value ${JSON.stringify(p1[field])}`);
				}
			});
			Object.keys(p2).forEach((field) => {
				if (p2[field] !== undefined) {
					assert.ok(field in p1, `field ${field} missing in p1, in p2 it has value ${
						JSON.stringify(p2[field])}`);
				}
			});
		}
	});
}

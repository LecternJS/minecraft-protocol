module.exports = {
	BaseClient: {
		host: 'localhost',
		port: 25565,
		username: '',
		password: '',
		auth: 'mojang',
		production: false,
		version: this.DefaultMinecraftVersion,
		offlineMode: false,
		customPackets: {},
		useragent: 'Minecraft',
		sessionServer: 'https://sessionserver.mojang.com',
		authServer: 'https://authserver.mojang.com',
		skipValidation: false,
		keepalive: {
			enabled: true,
			interval: 30000
		}
	},
	Events: {
		ConnectionAllowed: 'connect_allowed',
		KeepAlive: 'keep_alive'
	},
	Chunks: {
		SetProtocol: 'set_protocol',
		LoginStart: 'login_start'
	},
	DefaultMinecraftVersion: '1.16.4',
	SupportedMinecraftVersions: ['1.7', '1.8', '1.9', '1.10', '1.11.2', '1.12.2', '1.13.2', '1.14.4', '1.15.2', '1.16.4'],
	ProtocolStates: {
		HANDSHAKING: 'handshaking',
		STATUS: 'status',
		LOGIN: 'login',
		PLAY: 'play'
	},
	Cipher: 'aes-128-cfb8',
	XSTSRelyingParty: 'rp://api.minecraftservices.com/',
	MinecraftServicesLogWithXbox: 'https://api.minecraftservices.com/authentication/login_with_xbox',
	MinecraftServicesEntitlement: 'https://api.minecraftservices.com/entitlements/mcstore',
	MinecraftServicesProfile: 'https://api.minecraftservices.com/minecraft/profile',
	NodeFetchOptions: {
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'minecraft-protocol'
		}
	},
	MSALConfig: {
		auth: {
			clientId: '389b1b32-b5d5-43b2-bddc-84ce938d6737',
			authority: 'https://login.microsoftonline.com/consumers'
		}
	},
	LauncherProfiles: 'launcher_profiles.json'
};

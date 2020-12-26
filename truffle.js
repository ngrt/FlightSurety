var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "";

module.exports = {
	networks: {
		development: {
			host: "127.0.0.1",     // Localhost (default: none)
			port: 7545,            // Standard Ethereum port (default: none)
			network_id: "*",       // Any network (default: none)
			gas: "99999999",
		},
	},
	compilers: {
		solc: {
			version: "^0.4.24"
		}
	}
};
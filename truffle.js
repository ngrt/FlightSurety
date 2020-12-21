var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "tongue bid reason boil aunt wire what armed globe trend spoil fiction";

module.exports = {
	networks: {
		development: {
			provider: function () {
				return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
			},
			network_id: '*',
			gas: 9999999
		}
	},
	compilers: {
		solc: {
			version: "^0.4.24"
		}
	}
};
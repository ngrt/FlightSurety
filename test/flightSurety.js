var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {
	
	var config;
	beforeEach('setup contract', async () => {
		config = await Test.Config(accounts);
		await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
	});
	
	it(`(multiparty) has correct initial isOperational() value`, async function () {
		
		// Get operating status
		let status = await config.flightSuretyData.isOperational.call();
		assert.equal(status, true, "Incorrect initial operating status value");
		
	});
	
	it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
		
		// Ensure that access is denied for non-Contract Owner account
		let accessDenied = false;
		try {
			await config.flightSuretyData.setOperatingStatus(false, {from: config.testAddresses[2]});
		} catch (e) {
			accessDenied = true;
		}
		assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
		
	});
	
	it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
		
		// Ensure that access is allowed for Contract Owner account
		let accessDenied = false;
		try {
			await config.flightSuretyData.setOperatingStatus(false);
		} catch (e) {
			accessDenied = true;
		}
		assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
		
	});
	
	it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
		
		await config.flightSuretyData.setOperatingStatus(false);
		
		let reverted = false;
		try {
			await config.flightSurety.setTestingMode(true);
		} catch (e) {
			reverted = true;
		}
		assert.equal(reverted, true, "Access not blocked for requireIsOperational");
		
		// Set it back for other tests to work
		await config.flightSuretyData.setOperatingStatus(true);
		
	});
	
	it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
		
		// ARRANGE
		let newAirline = accounts[2];
		await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei("10", "ether")});
		
		// ACT
		await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
		
		let result = await config.flightSuretyData.isAirline.call(newAirline);
		
		// ASSERT
		assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
		
	});
	
	it('(airline) can register an Airline using registerAirline() if fund', async () => {
		// ARRANGE
		let newAirline = accounts[2];
		await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei("10", "ether")});
		
		// ACT
		await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
		
		// ASSERT
		const airlineFetched = await config.flightSuretyData.getAirline.call(newAirline)
		assert.equal(airlineFetched[1], true, "Airline should be able to register another airline");
	})
	
	it('(airline) after fifth airline registration go on multi-consensus mode', async () => {
		// ARRANGE
		let airlineOne = accounts[2];
		let airlineTwo = accounts[3];
		let airlineThree = accounts[4];
		let airlineFour = accounts[5];
		let airlineFive = accounts[6];
		
		await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineOne, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineOne, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineTwo, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineTwo, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineThree, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineThree, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineFour, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineFour, value: web3.utils.toWei("10", "ether")});
		
		// ACT
		await config.flightSuretyApp.registerAirline(airlineFive, {from: config.firstAirline});
		
		// ASSERT
		const airlineFetched = await config.flightSuretyData.getAirline.call(airlineFive)
		assert.equal(airlineFetched[1], false, "Airline should not be register but just added in the list");
	})
	
	it('(airline) sixth airline approved by half of the pool then it is registered', async () => {
		// ARRANGE
		let airlineOne = accounts[2];
		let airlineTwo = accounts[3];
		let airlineThree = accounts[4];
		let airlineFour = accounts[5];
		let airlineFive = accounts[6];
		
		await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineOne, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineOne, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineTwo, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineTwo, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineThree, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineThree, value: web3.utils.toWei("10", "ether")});
		
		await config.flightSuretyApp.registerAirline(airlineFour, {from: config.firstAirline});
		await config.flightSuretyApp.fund({from: airlineFour, value: web3.utils.toWei("10", "ether")});
		
		// ACT
		await config.flightSuretyApp.registerAirline(airlineFive, {from: config.firstAirline});
		await config.flightSuretyApp.registerAirline(airlineFive, {from: airlineOne});
		
		// ASSERT
		const airlineFetched = await config.flightSuretyData.getAirline.call(airlineFive)
		assert.equal(airlineFetched[0], airlineFive, "Airline should be registered");
		assert.equal(airlineFetched[1], false, "Airline should be registered but not validated");
		assert.equal(web3.utils.fromWei(airlineFetched[2], "ether"), 0, "Airline should have 0 ETH");
		assert.equal(airlineFetched[3].length, Math.floor(5 / 2), "Airline should be validated by half of the pool");
	})
	
	it('(flight) register a flight', async () => {
		// GIVEN
		const flightCode = 'AF2021';
		const time = Date.now();
		const airline = config.firstAirline;
		
		// WHEN
		await config.flightSuretyApp.registerFlight(flightCode, time, airline, {from: config.firstAirline});
		
		// THEN
		const t = await config.flightSuretyData.flightsAvailable.call();
		const flightFetched = await config.flightSuretyData.getFlight.call(t[0]);
		
		// console.log(new BigNumber(flightFetched[2]))
		// console.log(Date(new BigNumber(flightFetched[2])))
		
		assert.equal(flightFetched[0], flightCode, "Flight has same time");
		assert.equal(new BigNumber(flightFetched[1]), 0, "Flight has same status code");
		assert.equal(new BigNumber(flightFetched[2]), time, "Flight has same time");
		assert.equal(flightFetched[3], airline, "Flight has same airline");
		assert.equal(flightFetched[4].length, 0, "Flight has no insuree");
	})
	
	it('(passenger) after flight registered can purchase an insurance', async () => {
		// GIVEN
		const flightCode = 'AF2021';
		const time = Date.now();
		const airline = config.firstAirline;
		const passenger = accounts[9];
		
		await config.flightSuretyApp.registerFlight(flightCode, time, airline, {from: config.firstAirline});
		
		// WHEN
		await config.flightSuretyApp.buy(flightCode, time, airline, {
			from: passenger,
			value: web3.utils.toWei("0.5", "ether")
		});
		
		// THEN
		const t = await config.flightSuretyData.flightsAvailable.call();
		const flightFetched = await config.flightSuretyData.getFlight.call(t[0]);
		
		assert.equal(flightFetched[4][0], passenger, "Flight has no insuree");
	})
});

import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {
	
	let flights = [];
	
	let contract = new Contract('localhost', () => {
		
		// Read transaction
		contract.isOperational((error, result) => {
			display('Operational Status', 'Check if contract is operational', [{
				label: 'Operational Status',
				error: error,
				value: result
			}]);
		});
		
		contract.fetchFlights((err, result) => {
			result.map(key => {
				contract.fetchFlight(key, (err, result) => {
					if (result[2] > Date.now()) {
						flights.push(result);
						console.log(result)
						let option = document.createElement('option');
						option.value = key
						option.innerHTML = result[0]
						DOM.elid("flights-buy-insurance").appendChild(option);
						DOM.elid("flights-fetch-status").appendChild(option.cloneNode(true));
					}
				})
			})
		});
		
		// User-submitted transaction
		DOM.elid('submit-oracle').addEventListener('click', () => {
			let flightKey = DOM.elid('flights-fetch-status').value;
			let flightValue = DOM.elid('flights-fetch-status').options[DOM.elid('flights-fetch-status').selectedIndex].text;
			let flightSelected = flights.filter(flight => flight[0] === flightValue)
			// Write transaction
			contract.fetchFlightStatus(flightValue, flightSelected[0][3], flightSelected[0][2], (error, result) => {
				contract.fetchFlight(flightKey, (err, result) => {
					display('Oracles', 'Trigger oracles', [{
						label: 'Fetch Flight Status',
						error: error,
						value: result.flight + ' ' + result.statusCode + " status"
					}]);
				});
			});
		})
		
		// User-submitted transaction
		DOM.elid('register-airline').addEventListener('click', () => {
			let airlineAddress = DOM.elid('airline-address').value;
			contract.registerAirline(airlineAddress, (error, result) => {
				display('Airline', 'Register Airline', [{
					label: 'Register Airline',
					error: error,
					value: airlineAddress
				}]);
			});
		})
		
		DOM.elid('fund-airline').addEventListener('click', () => {
			let airlineAddress = DOM.elid('airline-address-fund').value;
			let amount = DOM.elid('airline-eth-fund').value;
			contract.fundAirline(airlineAddress, amount, (error, result) => {
					display('Airline', 'Fund Airline', [{
						label: 'Fund airline Status',
						error: error,
						value: airlineAddress + 'funded with ' + amount
					}]);
				}
			);
		})
		
		DOM.elid('register-flight').addEventListener('click', () => {
			let flightNumber = DOM.elid('flight-number').value;
			let flightAirline = DOM.elid('flight-airline').value;
			let flightDate = Date.parse(DOM.elid('flight-date').value);
			contract.registerFlight(flightNumber, flightDate, flightAirline, (error, result) => {
					flights = [];
					DOM.elid("flights-buy-insurance").innerHTML = "";
					DOM.elid("flights-fetch-status").innerHTML = "";
					contract.fetchFlights((err, result) => {
						result.map(key => {
							contract.fetchFlight(key, (err, result) => {
								if (result[2] > Date.now()) {
									flights.push(result);
									let option = document.createElement('option');
									option.value = key
									option.innerHTML = result[0]
									DOM.elid("flights-buy-insurance").appendChild(option);
									DOM.elid("flights-fetch-status").appendChild(option.cloneNode(true));
								}
							})
						})
					});
					display('Flight', 'Register flight', [{
						label: 'Register Flight Status',
						error: error,
						value: flightNumber + ' of ' + flightAirline + " at " + flightDate
					}]);
				}
			);
		})
		
		DOM.elid('buy-insurance').addEventListener('click', () => {
			let flightKey = DOM.elid('flights-buy-insurance').value;
			let amount = DOM.elid('amount-buy-insurance').value;
			let passenger = DOM.elid('passenger-buy-insurance').value;
			contract.buy(flightKey, amount, passenger, (error, result) => {
					display('Passenger', 'Buy insurance', [{
						label: 'Buy Insurance Status',
						error: error,
						value: passenger + ' bought insurance for ' + flightKey + " at " + amount
					}]);
				}
			);
		})
		
		DOM.elid('check-credit').addEventListener('click', () => {
			let payAddress = DOM.elid('credit-passenger').value;
			contract.getPassenger(payAddress, (error, result) => {
					DOM.elid('credit').innerText = result.credit + ' credit';
					DOM.elid('insurance').innerText = result.insuranceAmount + ' insurance';
				}
			);
		})
		
		DOM.elid('pay').addEventListener('click', () => {
			let payAddress = DOM.elid('pay-address').value;
			contract.pay(payAddress, (error, result) => {
					console.log(error, result)
					display('Passenger', 'Pay', [{
						label: 'Pay Status',
						error: error,
						value: payAddress + ' was paid'
					}]);
				}
			);
		})
		
	});
})();

function display(title, description, results) {
	let displayDiv = DOM.elid("display-wrapper");
	let section = DOM.section();
	section.appendChild(DOM.h2(title));
	section.appendChild(DOM.h5(description));
	results.map((result) => {
		let row = section.appendChild(DOM.div({className: 'row'}));
		row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
		row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
		section.appendChild(row);
	})
	displayDiv.append(section);
}
pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    uint256 public constant REGISTRATION_FEE = 10 ether;
    address private contractOwner;
    bool private operational = true;
    bool private multiConsensusMode = false;
    uint256 approvedAirlinesCount = 0;
    uint private counter = 0;

    struct Airline {
        address airlineAddress;
        bool registered;
        uint256 fund;
        address[] voters;
    }

    struct Customer {
        uint256 insuranceAmount;
        uint256 credit;
    }

    struct Flight {
        string flight;
        bool isRegistered;
        uint8 statusCode;
        uint256 time;
        address airline;
        address[] insurees;
    }

    Airline[] private airlinesPending;
    mapping(address => Airline) private airlinesRegistered;
    mapping(address => Customer) private customers;
    mapping(address => bool) private authorizedCallers;
    mapping(bytes32 => Flight) private flights;
    bytes32[] public flightKeys;

    constructor(address firstAirlineAddress) public {
        contractOwner = msg.sender;
        airlinesRegistered[firstAirlineAddress] = Airline(firstAirlineAddress, true, 0, new address[](0));
    }

    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier isAirlineAccepted(address airline) {
        require(airlinesRegistered[airline].registered, "Airline is not registered");
        _;
    }

    modifier hasAirlineMadeDeposit(address airline) {
        require(airlinesRegistered[airline].fund >= REGISTRATION_FEE, "Airline has not made its deposit of 10 ETH");
        _;
    }

    modifier entrancyGuard() {
        counter = counter.add(1);
        uint256 guard = counter;
        _;
        require(guard == counter, "not allowed");
    }

    modifier callerAuthorized() {
        require(authorizedCallers[msg.sender], "Caller not authorized");
        _;
    }

    function authorizeCaller(address caller) requireContractOwner external {
        authorizedCallers[caller] = true;
    }

    function isOperational() public view returns (bool) {
        return operational;
    }

    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function registerAirline(address airlineToAdd, address airlineCalling)
    requireIsOperational
    callerAuthorized
    isAirlineAccepted(airlineCalling)
    hasAirlineMadeDeposit(airlineCalling) external {
        require(airlinesRegistered[airlineToAdd].airlineAddress == address(0), "Airline already registered");
        if (approvedAirlinesCount < 5) {
            // automated registration
            airlinesRegistered[airlineToAdd] = Airline(airlineToAdd, true, 0, new address[](0));
        } else {
            // multi consensus case
            bool newAirline = true;
            for (uint c = 0; c < airlinesPending.length; c++) {
                if (airlinesPending[c].airlineAddress == airlineToAdd) {
                    newAirline = false;
                    alreadyVoted(airlinesPending[c].voters, msg.sender);
                    airlinesPending[c].voters.push(msg.sender);
                    haveEnoughVotes(airlinesPending[c], c);
                }
            }

            if (newAirline) {
                address[] memory adr = new address[](1);
                adr[0] = airlineCalling;
                Airline memory airline = Airline(airlineToAdd, false, 0, adr);
                airlinesPending.push(airline);
            }
        }
    }

    function getAirline(address airline) public view returns (address airlineAddress, bool registered, uint256 fund, address[] voters) {
        airlineAddress = airlinesRegistered[airline].airlineAddress;
        registered = airlinesRegistered[airline].registered;
        fund = airlinesRegistered[airline].fund;
        voters = airlinesRegistered[airline].voters;
        return (
        airlineAddress,
        registered,
        fund,
        voters
        );
    }

    function isAirline(address airline) public view returns (bool){
        return airlinesRegistered[airline].registered && airlinesRegistered[airline].fund >= REGISTRATION_FEE;
    }

    function buy(bytes32 key, address passenger) requireIsOperational callerAuthorized external payable {
        require(msg.value <= 1 ether, "Up to 1 eth");

        customers[passenger] = Customer(msg.value, 0);
        flights[key].insurees.push(passenger);
    }

    function processFlightStatus(address airline, string flight, uint256 timestamp, uint8 statusCode) requireIsOperational callerAuthorized external {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        flights[key].statusCode = statusCode;
        if (statusCode != 20) {
            for (uint c = 0;
                c < flights[key].insurees.length;
                c++) {
                creditInsurees(flights[key].insurees[c]);
            }
        }
    }

    function creditInsurees(address _address) requireIsOperational callerAuthorized internal {
        // effects
        uint256 amount = customers[_address].insuranceAmount;
        customers[_address].insuranceAmount = customers[_address].insuranceAmount.sub(amount);
        // integration
        customers[_address].credit = customers[_address].credit.add(amount).add(amount / 2);
    }

    function pay(address _address) requireIsOperational entrancyGuard callerAuthorized external payable {
        // checks
        require(_address == tx.origin, "Contracts not allowed");
        // effects
        uint256 amount = customers[_address].credit;
        customers[_address].credit = customers[_address].credit.sub(amount);
        // integration
        _address.transfer(amount);
    }

    function counterAirline() public view returns (uint){
        return approvedAirlinesCount;
    }

    function fund(address airlineCalling)
    requireIsOperational
    isAirlineAccepted(airlineCalling)
    callerAuthorized public payable {
        airlinesRegistered[airlineCalling].fund = airlinesRegistered[airlineCalling].fund.add(msg.value);
        if (airlinesRegistered[airlineCalling].fund >= REGISTRATION_FEE) {
            approvedAirlinesCount = approvedAirlinesCount.add(1);
            airlinesRegistered[airlineCalling].registered = true;
        }
    }

    function registerFlight(string flight, uint8 statusCode, uint256 time, address airline) requireIsOperational callerAuthorized external returns (bytes32) {
        bytes32 key = getFlightKey(airline, flight, time);
        flightKeys.push(key);
        flights[key] = Flight(flight, true, statusCode, time, airline, new address[](0));

        return key;
    }

    function flightsAvailable() public view returns (bytes32[]) {
        return flightKeys;
    }

    function getFlight(bytes32 key) public view returns (string flight, uint statusCode, uint256 time, address airline, address[] insurees){
        flight = flights[key].flight;
        statusCode = flights[key].statusCode;
        time = flights[key].time;
        airline = flights[key].airline;
        insurees = flights[key].insurees;
    }

    function getCustomer(address customerAddress) public view returns (uint256 insuranceAmount, uint256 credit){
        insuranceAmount = customers[customerAddress].insuranceAmount;
        credit = customers[customerAddress].credit;

        return (insuranceAmount, credit);
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() public payable {
        fund(msg.sender);
    }


    function alreadyVoted(address[] voters, address _address) private pure {
        bool alreadyVotedForAirline;

        for (uint c = 0; c < voters.length; c++) {
            if (voters[c] == _address) {
                alreadyVotedForAirline = true;
                break;
            }
            require(!alreadyVotedForAirline, "Already voted for this airline");
        }
    }

    function haveEnoughVotes(Airline airline, uint i) callerAuthorized private {
        if (airline.voters.length >= approvedAirlinesCount / 2) {
            airlinesRegistered[airline.airlineAddress] = airline;
            delete airlinesPending[i];
        }
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns (bytes32){
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
}


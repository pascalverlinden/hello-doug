import "./errors.sol";

contract tracker is Errors{

	uint constant EVENT_CREATE = 1;
	uint constant EVENT_TRANSFER = 2;
	uint constant EVENT_CLAIM = 3;

	struct evt {
		uint etype;
		address actor;
		uint time;
	}

	struct history {
		bool claimed;
		uint length;
		bytes32 secretHash;
		address currentOwner;

		mapping(uint => evt) events;
	}

	function addEvent (history storage hist, uint etype,  address actor) internal {

		hist.length = hist.length + 1;

		evt newEvent = hist.events[hist.length];

		newEvent.etype = etype;
		newEvent.actor = actor;
		newEvent.time = block.timestamp;

		return;
	}

	function createEvent(history storage hist,  address actor, bytes32 secretHash) internal returns (uint error) {
		
		if (hist.length != 0){
			return INVALID_STATE;
		}

		hist.secretHash = secretHash;
		hist.currentOwner = actor;
		hist.claimed = true;

		addEvent(hist, EVENT_CREATE, msg.sender);
		return NO_ERROR;
	}

	function transferEvent(history storage hist, address actor, address newOwner) internal returns (uint error) {
		if (!hist.claimed){
			return INVALID_STATE;
		}

		if (actor != hist.currentOwner){
			return ACCESS_DENIED;
		}

		hist.currentOwner = newOwner;
		hist.claimed = false;

		addEvent(hist, EVENT_TRANSFER, msg.sender);

		return NO_ERROR;
	}

	function claimEvent(history storage hist, address actor, bytes32 secret, bytes32 newSecretHash) internal returns (uint error){
		if (hist.claimed){
			return INVALID_STATE;
		}

		if (actor != hist.currentOwner){
			return ACCESS_DENIED;
		}

		//Check if the hash of provided secret matches
		if (sha256(secret) != hist.secretHash){
			return PARAMETER_ERROR;
		}

		hist.currentOwner = msg.sender;
		hist.secretHash = newSecretHash;
		hist.claimed = true;

		addEvent(hist, EVENT_CLAIM, msg.sender);

		return NO_ERROR;
	}
}
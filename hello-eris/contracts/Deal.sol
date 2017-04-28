
contract Deal {

    bytes32 public id;
    bytes32 public buyer;
    bytes32 public seller;
    uint public amount;

    function Deal(bytes32 _id, bytes32 _buyer, bytes32 _seller, uint _amount) {
        id = _id;
        buyer = _buyer;
        seller = _seller;
        amount = _amount;
    }
}
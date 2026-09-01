// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HealthRecordRegistry
/// @notice Anchors a keccak256 hash of a health record on-chain so its
///         integrity can be independently verified later. The *content* of
///         the medical record is NEVER stored on-chain - only its hash - so
///         no patient data is ever exposed on a public, permanent ledger.
///         This gives the app real tamper-evidence: if anyone edits a record
///         in the database afterwards, the recomputed hash will no longer
///         match what's anchored here, and the app can flag it.
contract HealthRecordRegistry {
    struct Anchor {
        bytes32 dataHash;   // keccak256 hash of the canonical record JSON
        string fileCID;     // IPFS content ID of the attached file (empty if none)
        uint256 timestamp;  // block timestamp when it was anchored
        address anchoredBy; // wallet that submitted the anchor
        bool exists;
    }

    address public owner;

    // Wallets allowed to anchor records (the backend server's wallet, plus
    // any others the owner explicitly trusts). Keeping this separate from
    // `owner` means the anchoring key can be rotated without redeploying.
    mapping(address => bool) public isAnchorer;

    // recordId (keccak256 of the Mongo _id string) => Anchor
    mapping(bytes32 => Anchor) private anchors;

    event RecordAnchored(bytes32 indexed recordId, bytes32 dataHash, string fileCID, address indexed anchoredBy, uint256 timestamp);
    event AnchorerUpdated(address indexed anchorer, bool allowed);
    event OwnerUpdated(address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "HealthRecordRegistry: not owner");
        _;
    }

    modifier onlyAnchorer() {
        require(isAnchorer[msg.sender], "HealthRecordRegistry: not an authorized anchorer");
        _;
    }

    constructor() {
        owner = msg.sender;
        isAnchorer[msg.sender] = true;
        emit AnchorerUpdated(msg.sender, true);
    }

    /// @notice Grants or revokes permission to anchor records. Only the owner
    ///         can call this - lets you rotate the backend wallet's key if it
    ///         is ever compromised, without losing previously anchored data.
    function setAnchorer(address anchorer, bool allowed) external onlyOwner {
        isAnchorer[anchorer] = allowed;
        emit AnchorerUpdated(anchorer, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "HealthRecordRegistry: zero address");
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }

    /// @notice Anchors (or re-anchors) the hash for a given record, together
    ///         with the IPFS CID of its attached file (if any). The CID is
    ///         stored on-chain in plaintext (IPFS CIDs are not secret - they
    ///         are pointers to content that is already public on IPFS once
    ///         pinned), so anyone can independently fetch the exact file
    ///         version that was anchored, straight from the blockchain
    ///         record, without trusting this app's database.
    /// @dev Re-anchoring is allowed (e.g. a doctor legitimately corrects a
    ///      record); the frontend/backend keeps its own history in MongoDB
    ///      so the previous anchor is not lost, only superseded here.
    function anchorRecord(bytes32 recordId, bytes32 dataHash, string calldata fileCID) external onlyAnchorer {
        anchors[recordId] = Anchor({
            dataHash: dataHash,
            fileCID: fileCID,
            timestamp: block.timestamp,
            anchoredBy: msg.sender,
            exists: true
        });
        emit RecordAnchored(recordId, dataHash, fileCID, msg.sender, block.timestamp);
    }

    /// @notice Reads back what's anchored for a record.
    function getAnchor(bytes32 recordId)
        external
        view
        returns (bytes32 dataHash, string memory fileCID, uint256 timestamp, address anchoredBy, bool exists)
    {
        Anchor memory a = anchors[recordId];
        return (a.dataHash, a.fileCID, a.timestamp, a.anchoredBy, a.exists);
    }
}

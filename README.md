# PermaStore

A blockchain-powered decentralized cloud storage platform that addresses real-world issues like data centralization, privacy breaches, and high storage costs by enabling secure, incentivized, peer-to-peer file storage and retrieval — all on-chain.

---

## Overview

PermaStore consists of five main smart contracts that together form a decentralized, transparent, and efficient ecosystem for users and storage providers:

1. **Storage Token Contract** – Issues and manages the native token used for storage payments and incentives.
2. **File Registry Contract** – Handles file metadata registration, hashing, and storage deal creation.
3. **Provider Staking Contract** – Enables storage providers to stake tokens and commit to hosting data.
4. **Proof Verification Contract** – Verifies proofs of storage and data availability from providers.
5. **Reward Distribution Contract** – Automates token rewards and penalties for providers based on performance.

---

## Features

- **Token-based storage economy** with payments for uploads and incentives for hosting  
- **Decentralized file registry** ensuring immutability and censorship resistance  
- **Staking mechanisms** for storage providers to guarantee reliability  
- **Automated proof challenges** to verify data integrity and availability  
- **Reward and penalty system** to encourage honest participation  
- **Secure file retrieval** with on-chain verification  
- **Integration with off-chain storage protocols** (e.g., IPFS) via hashes  
- **User privacy focus** with encrypted metadata options  
- **Scalable deals** for long-term or short-term storage  

---

## Smart Contracts

### Storage Token Contract
- Mint, burn, and transfer storage tokens (PST)
- Staking pools for users and providers
- Token economics for supply control and inflation

### File Registry Contract
- Register file hashes (e.g., CID from IPFS) and metadata
- Create storage deals with duration and payment terms
- Track file ownership and access rights

### Provider Staking Contract
- Allow providers to stake PST tokens as collateral
- Commit to storing specific files or capacity
- Slash mechanisms for non-compliance

### Proof Verification Contract
- Submit and verify proofs of replication or possession
- Random challenges to ensure data availability
- Integration with oracles for off-chain proof submission

### Reward Distribution Contract
- Calculate and distribute rewards based on uptime and proofs
- Handle penalties for failed verifications
- Transparent payout logs and automation

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/permastore.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete decentralized storage experience.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License
 import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
  admin: string;
  paused: boolean;
  totalSupply: bigint;
  balances: Map<string, bigint>;
  stakedBalances: Map<string, bigint>;
  totalStaked: bigint;
  rewardRate: bigint;
  lastUpdateBlock: bigint;
  rewardPerTokenStored: bigint;
  userRewardPerTokenPaid: Map<string, bigint>;
  userRewards: Map<string, bigint>;
  MAX_SUPPLY: bigint;
  currentBlock: bigint; // Mock block height

  isAdmin(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setRewardRate(caller: string, newRate: bigint): { value: boolean } | { error: number };
  mint(caller: string, recipient: string, amount: bigint): { value: boolean } | { error: number };
  burn(caller: string, amount: bigint): { value: boolean } | { error: number };
  transfer(caller: string, recipient: string, amount: bigint, memo?: Buffer): { value: boolean } | { error: number };
  stake(caller: string, amount: bigint): { value: boolean } | { error: number };
  unstake(caller: string, amount: bigint): { value: boolean } | { error: number };
  claimRewards(caller: string): { value: bigint } | { error: number };
  advanceBlock(): void; // To simulate block progression
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  totalSupply: 0n,
  balances: new Map<string, bigint>(),
  stakedBalances: new Map<string, bigint>(),
  totalStaked: 0n,
  rewardRate: 100n,
  lastUpdateBlock: 0n,
  rewardPerTokenStored: 0n,
  userRewardPerTokenPaid: new Map<string, bigint>(),
  userRewards: new Map<string, bigint>(),
  MAX_SUPPLY: 1000000000000000n,
  currentBlock: 0n,

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  setRewardRate(caller: string, newRate: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newRate <= 0n) return { error: 106 };
    // Update global reward (simplified, no real block)
    this.rewardPerTokenStored = this.rewardPerTokenStored + (this.rewardRate * (this.currentBlock - this.lastUpdateBlock)) / (this.totalStaked || 1n);
    this.lastUpdateBlock = this.currentBlock;
    this.rewardRate = newRate;
    return { value: true };
  },

  mint(caller: string, recipient: string, amount: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (amount <= 0n) return { error: 106 };
    if (this.totalSupply + amount > this.MAX_SUPPLY) return { error: 103 };
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    this.totalSupply += amount;
    return { value: true };
  },

  burn(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.totalSupply -= amount;
    return { value: true };
  },

  transfer(caller: string, recipient: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.balances.set(recipient, (this.balances.get(recipient) || 0n) + amount);
    return { value: true };
  },

  stake(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    // Update global
    this.rewardPerTokenStored = this.rewardPerTokenStored + (this.rewardRate * (this.currentBlock - this.lastUpdateBlock)) / (this.totalStaked || 1n);
    this.lastUpdateBlock = this.currentBlock;
    // Update user
    const staked = this.stakedBalances.get(caller) || 0n;
    const earned = (this.userRewards.get(caller) || 0n) + staked * (this.rewardPerTokenStored - (this.userRewardPerTokenPaid.get(caller) || 0n));
    this.userRewards.set(caller, earned);
    this.userRewardPerTokenPaid.set(caller, this.rewardPerTokenStored);
    const bal = this.balances.get(caller) || 0n;
    if (bal < amount) return { error: 101 };
    this.balances.set(caller, bal - amount);
    this.stakedBalances.set(caller, staked + amount);
    this.totalStaked += amount;
    return { value: true };
  },

  unstake(caller: string, amount: bigint) {
    if (this.paused) return { error: 104 };
    if (amount <= 0n) return { error: 106 };
    // Update global
    this.rewardPerTokenStored = this.rewardPerTokenStored + (this.rewardRate * (this.currentBlock - this.lastUpdateBlock)) / (this.totalStaked || 1n);
    this.lastUpdateBlock = this.currentBlock;
    // Update user
    const staked = this.stakedBalances.get(caller) || 0n;
    const earned = (this.userRewards.get(caller) || 0n) + staked * (this.rewardPerTokenStored - (this.userRewardPerTokenPaid.get(caller) || 0n));
    this.userRewards.set(caller, earned);
    this.userRewardPerTokenPaid.set(caller, this.rewardPerTokenStored);
    if (staked < amount) return { error: 102 };
    this.stakedBalances.set(caller, staked - amount);
    this.totalStaked -= amount;
    this.balances.set(caller, (this.balances.get(caller) || 0n) + amount);
    return { value: true };
  },

  claimRewards(caller: string) {
    if (this.paused) return { error: 104 };
    // Update global
    this.rewardPerTokenStored = this.rewardPerTokenStored + (this.rewardRate * (this.currentBlock - this.lastUpdateBlock)) / (this.totalStaked || 1n);
    this.lastUpdateBlock = this.currentBlock;
    // Update user
    const staked = this.stakedBalances.get(caller) || 0n;
    const earned = (this.userRewards.get(caller) || 0n) + staked * (this.rewardPerTokenStored - (this.userRewardPerTokenPaid.get(caller) || 0n));
    if (earned <= 0n) return { error: 108 };
    this.userRewards.set(caller, 0n);
    this.userRewardPerTokenPaid.set(caller, this.rewardPerTokenStored);
    this.balances.set(caller, (this.balances.get(caller) || 0n) + earned);
    this.totalSupply += earned;
    return { value: earned };
  },

  advanceBlock() {
    this.currentBlock += 1n;
  },
};

describe("PermaStore Storage Token", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.totalSupply = 0n;
    mockContract.balances = new Map();
    mockContract.stakedBalances = new Map();
    mockContract.totalStaked = 0n;
    mockContract.rewardRate = 100n;
    mockContract.lastUpdateBlock = 0n;
    mockContract.rewardPerTokenStored = 0n;
    mockContract.userRewardPerTokenPaid = new Map();
    mockContract.userRewards = new Map();
    mockContract.currentBlock = 0n;
  });

  it("should allow admin to mint tokens", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 1000n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(1000n);
    expect(mockContract.totalSupply).toBe(1000n);
  });

  it("should prevent non-admin from minting", () => {
    const result = mockContract.mint("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 1000n);
    expect(result).toEqual({ error: 100 });
  });

  it("should prevent minting over max supply", () => {
    const result = mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", mockContract.MAX_SUPPLY + 1n);
    expect(result).toEqual({ error: 103 });
  });

  it("should allow burning tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 500n);
    const result = mockContract.burn("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(300n);
    expect(mockContract.totalSupply).toBe(300n);
  });

  it("should prevent burning more than balance", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 500n);
    const result = mockContract.burn("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 600n);
    expect(result).toEqual({ error: 101 });
  });

  it("should allow transferring tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 500n);
    const result = mockContract.transfer("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(300n);
    expect(mockContract.balances.get("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP")).toBe(200n);
  });

  it("should prevent transfer when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.transfer("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP", 10n);
    expect(result).toEqual({ error: 104 });
  });

  it("should allow staking tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 500n);
    const result = mockContract.stake("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(300n);
    expect(mockContract.stakedBalances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(200n);
    expect(mockContract.totalStaked).toBe(200n);
  });

  it("should allow unstaking tokens", () => {
    mockContract.mint(mockContract.admin, "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 500n);
    mockContract.stake("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 200n);
    const result = mockContract.unstake("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.stakedBalances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(100n);
    expect(mockContract.balances.get("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151")).toBe(400n);
    expect(mockContract.totalStaked).toBe(100n);
  });

  it("should calculate and claim rewards after blocks", () => {
    const user = "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151";
    mockContract.mint(mockContract.admin, user, 500n);
    mockContract.stake(user, 200n);
    mockContract.advanceBlock();
    mockContract.advanceBlock(); // 2 blocks
    // Reward: rate 100 * 2 blocks / 200 staked = 1 per token, total 200 rewards
    const result = mockContract.claimRewards(user);
    expect(result).toEqual({ value: 200n });
    expect(mockContract.balances.get(user)).toBe(300n + 200n);
    expect(mockContract.totalSupply).toBe(500n + 200n);
  });

  it("should prevent claiming zero rewards", () => {
    const user = "ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151";
    mockContract.mint(mockContract.admin, user, 500n);
    const result = mockContract.claimRewards(user);
    expect(result).toEqual({ error: 108 });
  });

  it("should allow admin to set reward rate", () => {
    const result = mockContract.setRewardRate(mockContract.admin, 200n);
    expect(result).toEqual({ value: true });
    expect(mockContract.rewardRate).toBe(200n);
  });

  it("should prevent non-admin from setting reward rate", () => {
    const result = mockContract.setRewardRate("ST2CY5V39NHDP5P0RZMQ1P9AJKP9KWRYTW54S4151", 200n);
    expect(result).toEqual({ error: 100 });
  });
});
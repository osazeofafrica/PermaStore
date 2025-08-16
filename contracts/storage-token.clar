;; storage-token.clar
;; PermaStore Storage Token Contract
;; Implements SIP-010 compliant fungible token with minting, burning, transferring,
;; staking for rewards (used for storage incentives), admin controls, pause functionality,
;; and basic token economics including inflation via reward emissions.

(define-trait fungible-token-trait
  (
    (transfer (principal principal uint (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-INSUFFICIENT-STAKE u102)
(define-constant ERR-MAX-SUPPLY-REACHED u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-INVALID-AMOUNT u106)
(define-constant ERR-NO-REWARDS u108)

;; Token metadata (SIP-010 compliant)
(define-constant TOKEN-NAME (as (string-ascii 32) "PermaStore Token"))
(define-constant TOKEN-SYMBOL (as (string-ascii 32) "PST"))
(define-constant TOKEN-DECIMALS u6)
(define-constant MAX-SUPPLY u1000000000000000) ;; 1B tokens max, adjusted for decimals
(define-constant TOKEN-URI none) ;; Optional URI for token metadata

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var total-supply uint u0)

;; Balances
(define-map balances principal uint)

;; Staking data
(define-map staked-balances principal uint)
(define-data-var total-staked uint u0)
(define-data-var reward-rate uint u100) ;; Rewards per block per staked token (scaled)
(define-data-var last-update-block uint block-height)
(define-data-var reward-per-token-stored uint u0)
(define-map user-reward-per-token-paid principal uint)
(define-map user-rewards principal uint)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: update reward for a user
(define-private (update-reward (account principal))
  (let
    (
      (staked (default-to u0 (map-get? staked-balances account)))
      (reward-per-token (reward-per-token))
      (earned (+ (user-earned account) (* staked (- reward-per-token (default-to u0 (map-get? user-reward-per-token-paid account))))))
    )
    (map-set user-rewards account earned)
    (map-set user-reward-per-token-paid account reward-per-token)
    earned
  )
)

;; Private helper: calculate current reward per token
(define-private (reward-per-token)
  (if (is-eq (var-get total-staked) u0)
    (var-get reward-per-token-stored)
    (+ (var-get reward-per-token-stored)
       (/ (* (var-get reward-rate) (- block-height (var-get last-update-block))) (var-get total-staked))
    )
  )
)

;; Private helper: update global reward state
(define-private (update-global-reward)
  (begin
    (var-set reward-per-token-stored (reward-per-token))
    (var-set last-update-block block-height)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin tx-sender)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (print { event: "admin-transfer", new-admin: new-admin })
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (print { event: "pause-set", paused: pause })
    (ok pause)
  )
)

;; Set reward rate (admin only, for inflation control)
(define-public (set-reward-rate (new-rate uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-rate u0) (err ERR-INVALID-AMOUNT))
    (update-global-reward)
    (var-set reward-rate new-rate)
    (print { event: "reward-rate-set", rate: new-rate })
    (ok true)
  )
)

;; Mint new tokens (admin only, for initial distribution or incentives)
(define-public (mint (recipient principal) (amount uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (asserts! (not (is-eq recipient tx-sender)) (err ERR-ZERO-ADDRESS))
    (let ((new-supply (+ (var-get total-supply) amount)))
      (asserts! (<= new-supply MAX-SUPPLY) (err ERR-MAX-SUPPLY-REACHED))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (var-set total-supply new-supply)
      (print { event: "mint", recipient: recipient, amount: amount })
      (ok true)
    )
  )
)

;; Burn tokens
(define-public (burn (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (var-set total-supply (- (var-get total-supply) amount))
      (print { event: "burn", sender: tx-sender, amount: amount })
      (ok true)
    )
  )
)

;; Transfer tokens (SIP-010 compliant)
(define-public (transfer (recipient principal) (amount uint) (memo (optional (buff 34))))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (asserts! (not (is-eq recipient tx-sender)) (err ERR-ZERO-ADDRESS))
    (let ((sender-balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= sender-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- sender-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (print { event: "transfer", sender: tx-sender, recipient: recipient, amount: amount, memo: memo })
      (ok true)
    )
  )
)

;; Stake tokens for rewards
(define-public (stake (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (update-global-reward)
    (update-reward tx-sender)
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (map-set staked-balances tx-sender (+ amount (default-to u0 (map-get? staked-balances tx-sender))))
      (var-set total-staked (+ (var-get total-staked) amount))
      (print { event: "stake", staker: tx-sender, amount: amount })
      (ok true)
    )
  )
)

;; Unstake tokens
(define-public (unstake (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (update-global-reward)
    (update-reward tx-sender)
    (let ((staked (default-to u0 (map-get? staked-balances tx-sender))))
      (asserts! (>= staked amount) (err ERR-INSUFFICIENT-STAKE))
      (map-set staked-balances tx-sender (- staked amount))
      (var-set total-staked (- (var-get total-staked) amount))
      (map-set balances tx-sender (+ amount (default-to u0 (map-get? balances tx-sender))))
      (print { event: "unstake", staker: tx-sender, amount: amount })
      (ok true)
    )
  )
)

;; Claim staking rewards
(define-public (claim-rewards)
  (begin
    (ensure-not-paused)
    (update-global-reward)
    (let ((rewards (update-reward tx-sender)))
      (asserts! (> rewards u0) (err ERR-NO-REWARDS))
      (map-set user-rewards tx-sender u0)
      (map-set balances tx-sender (+ rewards (default-to u0 (map-get? balances tx-sender))))
      (var-set total-supply (+ (var-get total-supply) rewards))
      (print { event: "claim-rewards", claimant: tx-sender, amount: rewards })
      (ok rewards)
    )
  )
)

;; Read-only: get balance (SIP-010)
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

;; Read-only: get staked balance
(define-read-only (get-staked-balance (account principal))
  (ok (default-to u0 (map-get? staked-balances account)))
)

;; Read-only: get pending rewards
(define-read-only (get-pending-rewards (account principal))
  (let
    (
      (staked (default-to u0 (map-get? staked-balances account)))
      (reward-per-token (reward-per-token))
      (earned (+ (default-to u0 (map-get? user-rewards account))
                 (* staked (- reward-per-token (default-to u0 (map-get? user-reward-per-token-paid account))))))
    )
    (ok earned)
  )
)

;; Read-only: get total supply (SIP-010)
(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

;; Read-only: get name (SIP-010)
(define-read-only (get-name)
  (ok TOKEN-NAME)
)

;; Read-only: get symbol (SIP-010)
(define-read-only (get-symbol)
  (ok TOKEN-SYMBOL)
)

;; Read-only: get decimals (SIP-010)
(define-read-only (get-decimals)
  (ok TOKEN-DECIMALS)
)

;; Read-only: get token uri (SIP-010)
(define-read-only (get-token-uri)
  (ok TOKEN-URI)
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get reward rate
(define-read-only (get-reward-rate)
  (ok (var-get reward-rate))
)

;; Read-only: get total staked
(define-read-only (get-total-staked)
  (ok (var-get total-staked))
)

;; Private: user earned rewards
(define-private (user-earned (account principal))
  (default-to u0 (map-get? user-rewards account))
)
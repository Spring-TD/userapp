# Settlement Wallet (renamed → Repayment Wallet)

The **Settlement** merchant wallet type was renamed to **Repayment** (mirroring Backend-platter/Plata's
`BILLING` / `TREASURY` / `REPAYMENT` naming). Spring keeps a separate **KYC** merchant wallet
(unlike Plata), and all `/settlement/*` routes plus `Settlement`-named service/controller methods
remain available as deprecated aliases that delegate to the `Repayment` equivalents.

See **[`repayment-wallet.md`](./repayment-wallet.md)** for the current documentation.

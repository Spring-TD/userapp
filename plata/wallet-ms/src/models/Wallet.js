"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = exports.TransactionType = exports.WalletStatus = exports.MerchantWalletType = void 0;
// Define wallet types for merchants (one set per app at creation)
var MerchantWalletType;
(function (MerchantWalletType) {
    MerchantWalletType["BILLING"] = "BILLING";
    MerchantWalletType["TREASURY"] = "TREASURY";
    MerchantWalletType["REPAYMENT"] = "REPAYMENT"; // Repayment Wallet (formerly Settlement Wallet)
})(MerchantWalletType || (exports.MerchantWalletType = MerchantWalletType = {}));
var WalletStatus;
(function (WalletStatus) {
    WalletStatus["ACTIVE"] = "ACTIVE";
    WalletStatus["INACTIVE"] = "INACTIVE";
    WalletStatus["SUSPENDED"] = "SUSPENDED";
})(WalletStatus || (exports.WalletStatus = WalletStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "CREDIT";
    TransactionType["DEBIT"] = "DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
//# sourceMappingURL=Wallet.js.map
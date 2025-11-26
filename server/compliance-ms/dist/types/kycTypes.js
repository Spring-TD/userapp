"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceWorkflowStatus = exports.BUSINESS_OPTIONAL_DOCUMENTS = exports.INDIVIDUAL_OPTIONAL_DOCUMENTS = exports.INDIVIDUAL_REQUIRED_DOCUMENTS = exports.RiskLevel = exports.BusinessType = exports.BusinessDocumentType = exports.DocumentType = exports.UserType = exports.KYCStatus = void 0;
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["PENDING"] = "pending";
    KYCStatus["IN_PROGRESS"] = "in_progress";
    KYCStatus["COMPLETED"] = "completed";
    KYCStatus["FAILED"] = "failed";
    KYCStatus["REVIEW"] = "review";
    KYCStatus["APPROVED"] = "approved";
    KYCStatus["REJECTED"] = "rejected";
})(KYCStatus || (exports.KYCStatus = KYCStatus = {}));
var UserType;
(function (UserType) {
    UserType["INDIVIDUAL"] = "individual";
    UserType["MERCHANT"] = "merchant";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["IDENTITY"] = "identity";
    DocumentType["ADDRESS"] = "address";
    DocumentType["INCOME_PROOF"] = "income_proof";
    DocumentType["BUSINESS_REGISTRATION"] = "business_registration";
    DocumentType["BUSINESS_LICENSE"] = "business_license";
    DocumentType["CORPORATE_STRUCTURE"] = "corporate_structure";
    DocumentType["BENEFICIAL_OWNERSHIP"] = "beneficial_ownership";
    DocumentType["ARTICLES_OF_INCORPORATION"] = "articles_of_incorporation";
    DocumentType["FINANCIAL_STATEMENTS"] = "financial_statements";
    DocumentType["TAX_CERTIFICATE"] = "tax_certificate";
    DocumentType["BANK"] = "bank";
    DocumentType["TAX"] = "tax";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var BusinessDocumentType;
(function (BusinessDocumentType) {
    BusinessDocumentType["CERTIFICATE_OF_INCORPORATION"] = "certificate_of_incorporation";
    BusinessDocumentType["ARTICLES_OF_ASSOCIATION"] = "articles_of_association";
    BusinessDocumentType["LIST_OF_SHAREHOLDERS"] = "list_of_shareholders";
    BusinessDocumentType["PROOF_OF_ADDRESS"] = "proof_of_address";
    BusinessDocumentType["BANK_STATEMENT"] = "bank_statement";
    BusinessDocumentType["AML_POLICIES"] = "aml_policies";
    BusinessDocumentType["DATA_PRIVACY_POLICY"] = "data_privacy_policy";
})(BusinessDocumentType || (exports.BusinessDocumentType = BusinessDocumentType = {}));
var BusinessType;
(function (BusinessType) {
    BusinessType["SOLE_PROPRIETORSHIP"] = "sole_proprietorship";
    BusinessType["PARTNERSHIP"] = "partnership";
    BusinessType["LIMITED_LIABILITY_COMPANY"] = "limited_liability_company";
    BusinessType["CORPORATION"] = "corporation";
    BusinessType["NON_PROFIT"] = "non_profit";
    BusinessType["GOVERNMENT_ENTITY"] = "government_entity";
})(BusinessType || (exports.BusinessType = BusinessType = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["VERY_HIGH"] = "very_high";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
exports.INDIVIDUAL_REQUIRED_DOCUMENTS = [
    DocumentType.IDENTITY,
    DocumentType.ADDRESS
];
exports.INDIVIDUAL_OPTIONAL_DOCUMENTS = [
    DocumentType.INCOME_PROOF,
    DocumentType.BANK
];
exports.BUSINESS_OPTIONAL_DOCUMENTS = [
    DocumentType.BUSINESS_LICENSE,
    DocumentType.CORPORATE_STRUCTURE,
    DocumentType.ARTICLES_OF_INCORPORATION,
    DocumentType.FINANCIAL_STATEMENTS,
    DocumentType.TAX_CERTIFICATE
];
var ComplianceWorkflowStatus;
(function (ComplianceWorkflowStatus) {
    ComplianceWorkflowStatus["INITIAL_SCREENING"] = "initial_screening";
    ComplianceWorkflowStatus["DOCUMENT_REVIEW"] = "document_review";
    ComplianceWorkflowStatus["ENHANCED_DUE_DILIGENCE"] = "enhanced_due_diligence";
    ComplianceWorkflowStatus["RISK_ASSESSMENT"] = "risk_assessment";
    ComplianceWorkflowStatus["FINAL_APPROVAL"] = "final_approval";
    ComplianceWorkflowStatus["ONGOING_MONITORING"] = "ongoing_monitoring";
})(ComplianceWorkflowStatus || (exports.ComplianceWorkflowStatus = ComplianceWorkflowStatus = {}));
//# sourceMappingURL=kycTypes.js.map
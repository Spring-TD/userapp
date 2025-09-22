"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockDb_1 = require("../utils/mockDb");
const audit_1 = require("../utils/audit");
beforeEach(() => {
    (0, mockDb_1.clearMockData)();
    (0, audit_1.clearAuditLogs)();
    (0, mockDb_1.seedMockData)();
});
jest.setTimeout(10000);
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
describe('Test Setup', () => {
    it('should have a working test environment', () => {
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=setup.js.map
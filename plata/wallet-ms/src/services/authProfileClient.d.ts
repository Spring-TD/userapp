type InternalAuthProfile = {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
};
export declare function fetchWalletContact(identifier: string): Promise<InternalAuthProfile | undefined>;
export {};
//# sourceMappingURL=authProfileClient.d.ts.map
export declare const uploadToCloudinary: (buffer: Buffer, fileName: string, folder?: string) => Promise<{
    url: string;
    publicId: string;
}>;
export declare const deleteFromCloudinary: (publicId: string) => Promise<boolean>;
export declare const validateBusinessDocument: (buffer: Buffer, mimeType: string, fileSize: number) => {
    valid: boolean;
    error?: string;
};
declare const _default: {
    uploadToCloudinary: (buffer: Buffer, fileName: string, folder?: string) => Promise<{
        url: string;
        publicId: string;
    }>;
    deleteFromCloudinary: (publicId: string) => Promise<boolean>;
    validateBusinessDocument: (buffer: Buffer, mimeType: string, fileSize: number) => {
        valid: boolean;
        error?: string;
    };
};
export default _default;
//# sourceMappingURL=cloudinaryService.d.ts.map
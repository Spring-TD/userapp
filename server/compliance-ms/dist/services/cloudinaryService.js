"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBusinessDocument = exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const logger_1 = require("../utils/logger");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadToCloudinary = async (buffer, fileName, folder = 'business_documents') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: fileName,
            resource_type: 'auto',
            overwrite: false,
            invalidate: true
        }, (error, result) => {
            if (error) {
                logger_1.logger.error('Cloudinary upload error', { error: error.message });
                reject(error);
            }
            else if (result) {
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
            else {
                reject(new Error('Unknown error during Cloudinary upload'));
            }
        });
        const bufferStream = new stream_1.Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        return result.result === 'ok';
    }
    catch (error) {
        logger_1.logger.error('Cloudinary delete error', { error: error instanceof Error ? error.message : 'Unknown error' });
        return false;
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
const validateBusinessDocument = (buffer, mimeType, fileSize) => {
    if (mimeType !== 'application/pdf') {
        return {
            valid: false,
            error: 'Only PDF files are allowed for business documents'
        };
    }
    const maxSize = 5 * 1024 * 1024;
    if (fileSize > maxSize) {
        return {
            valid: false,
            error: 'File size must not exceed 5MB'
        };
    }
    return { valid: true };
};
exports.validateBusinessDocument = validateBusinessDocument;
exports.default = {
    uploadToCloudinary: exports.uploadToCloudinary,
    deleteFromCloudinary: exports.deleteFromCloudinary,
    validateBusinessDocument: exports.validateBusinessDocument
};
//# sourceMappingURL=cloudinaryService.js.map
/**
 * Record storage - MongoDB-backed implementation.
 * Use recordStorageMongo from ./recordStorageMongo for all async operations.
 */
export { recordStorageMongo as recordStorage } from './recordStorageMongo';
import { recordStorageMongo } from './recordStorageMongo';
export default recordStorageMongo;

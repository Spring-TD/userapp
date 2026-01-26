import http from 'http';
import axios from 'axios';
import { config } from '../src/config/environment';

// Map of service names to their expected ports and test paths
const services = [
    { name: 'product-ms', port: 3005, path: '/api/v1/products/health', gatewayPath: '/api/v1/products/health' },
    { name: 'compliance-ms', port: 3003, path: '/api/v1/compliance/health', gatewayPath: '/api/v1/compliance/health' },
    { name: 'wallet-ms', port: 3004, path: '/api/v1/wallets/health', gatewayPath: '/api/v1/wallets/health' },
    { name: 'billing-ms', port: 3006, path: '/api/v1/billing/health', gatewayPath: '/api/v1/billing/health' },
    { name: 'create-app-ms', port: 3002, path: '/api/v1/apps/health', gatewayPath: '/api/v1/apps/health' },
    { name: 'payment-ms', port: 3007, path: '/api/v1/payments/health', gatewayPath: '/api/v1/payments/health' },
    { name: 'client-auth-ms', port: 3001, path: '/api/v1/auth/health', gatewayPath: '/api/v1/auth/health' },
];

const GATEWAY_URL = `http://localhost:${config.port}`;
const mockServers: http.Server[] = [];

// Helper to check if a port is in use
const isPortInUse = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
};

// Start a mock server for a service
const startMockServer = (service: { name: string; port: number }) => {
    const server = http.createServer((req, res) => {
        // Log that we received a request
        // console.log(`[Mock ${service.name}] Received ${req.method} ${req.url}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', service: service.name, mocked: true }));
    });

    server.listen(service.port, () => {
        console.log(`[Mock] Started mock ${service.name} on port ${service.port}`);
    });
    mockServers.push(server);
};

const main = async () => {
    console.log('Starting Gateway Integration Test...');

    // 1. Setup downstream services (Real or Mock)
    for (const service of services) {
        const inUse = await isPortInUse(service.port);
        if (inUse) {
            console.log(`[Info] Port ${service.port} is in use. Assuming ${service.name} is running.`);
        } else {
            startMockServer(service);
        }
    }

    // 2. Start Gateway (account-ms) if not running
    const gatewayInUse = await isPortInUse(config.port);
    if (gatewayInUse) {
        console.log(`[Info] Gateway port ${config.port} is in use. Testing against running instance.`);
    } else {
        console.log(`[Info] Starting local instance of account-ms...`);
        // Import index to start server. 
        // Note: This might fail if the build is not up to date or if there are runtime errors.
        // We use require to avoid top-level await issues if any, though import is fine in ts-node.
        require('../src/index');
        // Give it a moment to start
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 3. Run Tests
    console.log('\n--- Testing Routes ---');
    let passed = 0;
    let failed = 0;

    for (const service of services) {
        const url = `${GATEWAY_URL}${service.gatewayPath}`;
        try {
            // We expect a 200 OK or 404 (if the path doesn't exist on the mock/real service but proxy worked)
            // Actually, if proxy works, we should get a response from the downstream.
            // If downstream is our mock, we get 200.
            // If downstream is real service, we hope /health exists.

            // Note: My mock responds to EVERYTHING with 200.
            // Real services usually have /health.

            const response = await axios.get(url, { validateStatus: () => true });

            if (response.status === 200) {
                console.log(`✅ [PASS] ${service.name}: ${url} -> ${response.status}`);
                passed++;
            } else if (response.status === 404) {
                // If 404, it might mean the service is reached but route is wrong, OR gateway didn't find route.
                // But gateway has a catch-all 404.
                // If the response comes from the SERVICE, it's a pass for the gateway (it forwarded).
                // How to distinguish?
                // My mock returns { mocked: true }.
                // Real services return { status: 'OK' ... } usually.
                // Gateway 404 returns { error: 'Route not found' }.

                if (response.data && response.data.error === 'Route not found') {
                    console.log(`❌ [FAIL] ${service.name}: Gateway returned 404 (Route not mapped?)`);
                    failed++;
                } else {
                    console.log(`⚠️ [WARN] ${service.name}: Service returned 404 (Gateway worked, but path wrong?)`);
                    passed++; // Counting as pass for Gateway connectivity
                }
            } else {
                console.log(`❌ [FAIL] ${service.name}: Status ${response.status}`);
                failed++;
            }
        } catch (error: any) {
            console.log(`❌ [FAIL] ${service.name}: Connection Error - ${error.message}`);
            failed++;
        }
    }

    console.log('\n--- Test Summary ---');
    console.log(`Total: ${services.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    // Cleanup
    mockServers.forEach(s => s.close());

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
};

main().catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
});

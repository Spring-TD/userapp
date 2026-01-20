import { AppConfigurationService } from './src/services/appConfigurationService';
import { AppConfigurationModel } from './src/models/appConfigurationModel';
import { AppModel } from './src/models/appModel';
import { AppService } from './src/services/appService';

// Color helper for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logTest(message: string) {
  log(`\n🧪 ${message}`, colors.cyan);
}

async function testConfigurations() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('Testing App Configuration System', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  let testAppId: string;
  let configService: AppConfigurationService;
  let appService: AppService;
  let createdConfigIds: string[] = [];

  try {
    // Initialize services
    configService = new AppConfigurationService();
    appService = new AppService();

    // Step 1: Create a test app
    logTest('Step 1: Creating a test app...');
    const testApp = await appService.createApp({
      name: 'Configuration Test App',
      websiteUrl: 'https://test-config.com',
      alias: 'test-config',
      description: 'This is a test app for configuration testing',
      merchantId: 'test-merchant-123'
    });
    testAppId = testApp.id;
    logSuccess(`App created with ID: ${testAppId}`);

    // Step 2: Get default configuration
    logTest('Step 2: Getting default configuration...');
    const defaultConfig = await configService.getAppConfiguration(testAppId);
    logSuccess(`Default configuration retrieved with ID: ${defaultConfig.id}`);
    logInfo(`Version Reference: ${defaultConfig.versionReference || 'Not set'}`);
    logInfo(`Is Published: ${defaultConfig.publishing.isPublished}`);
    logInfo(`Is Active: ${defaultConfig.isActive}`);

    // Step 3: Update app elements
    logTest('Step 3: Updating app elements...');
    const updatedConfig1 = await configService.updateAppConfiguration(testAppId, {
      appElements: {
        logo: {
          url: 'https://example.com/logo.png',
          altText: 'App Logo'
        },
        buttons: {
          primary: {
            textColor: '#ffffff',
            backgroundColor: '#FF4D4F'
          },
          secondary: {
            textColor: '#ffffff',
            backgroundColor: '#4A5568'
          }
        }
      }
    });
    logSuccess('App elements updated');
    logInfo(`Update Variance: ${updatedConfig1.updateVariance?.join(', ') || 'None'}`);

    // Step 4: Update app profile
    logTest('Step 4: Updating app profile colors...');
    const updatedConfig2 = await configService.updateAppConfiguration(testAppId, {
      appProfile: {
        textColors: {
          primary: '#FF4D4F',
          secondary: '#5E6D82',
          aux: '#E8E2D2'
        },
        elementColors: {
          primary: '#FF4D4F',
          secondary: '#5E6D82'
        },
        menuColors: {
          primary: '#FF4D4F',
          secondary: '#5E6D82',
          aux: '#E8E2D2'
        },
        backgroundColors: {
          primary: '#FF4D4F',
          secondary: '#5E6D82'
        }
      }
    });
    logSuccess('App profile colors updated');
    logInfo(`Update Variance: ${updatedConfig2.updateVariance?.join(', ') || 'None'}`);

    // Step 5: Update onboarding
    logTest('Step 5: Updating onboarding configuration...');
    const updatedConfig3 = await configService.updateAppConfiguration(testAppId, {
      onboarding: {
        splash1: {
          fontFamily: 'Roboto',
          title: 'Welcome to Our App',
          subtitle: 'Get started in seconds',
          textColors: {
            primary: '#000000',
            secondary: '#6c757d'
          },
          backgroundColors: {
            primary: '#ffffff',
            secondary: '#f8f9fa'
          },
          primaryColor: '#007bff',
          secondaryColor: '#6c757d'
        }
      }
    });
    logSuccess('Onboarding configuration updated');
    logInfo(`Update Variance: ${updatedConfig3.updateVariance?.join(', ') || 'None'}`);

    // Step 6: Update support
    logTest('Step 6: Updating support configuration...');
    const updatedConfig4 = await configService.updateAppConfiguration(testAppId, {
      support: {
        supportEmail: 'support@test-config.com',
        supportPhone: '+1234567890',
        website: 'https://test-config.com',
        linkedinPage: 'https://linkedin.com/company/test-config',
        socialMediaHandles: '@testconfig',
        privacyPolicyLink: 'https://test-config.com/privacy',
        termsAndConditionsLink: 'https://test-config.com/terms'
      }
    });
    logSuccess('Support configuration updated');

    // Step 7: Update policy/terms
    logTest('Step 7: Updating policy and terms...');
    const updatedConfig5 = await configService.updateAppConfiguration(testAppId, {
      policy: {
        policy: {
          title: 'Privacy Policy',
          content: '<p>This is our privacy policy content.</p>'
        },
        terms: {
          title: 'Terms and Conditions',
          content: '<p>These are our terms and conditions.</p>'
        }
      }
    });
    logSuccess('Policy and terms updated');

    // Step 8: Create a new configuration without deactivating
    logTest('Step 8: Creating a new configuration (without auto-deactivate)...');
    const newConfig = await configService.createConfiguration(testAppId, {
      appProfile: {
        textColors: {
          primary: '#00FF00',
          secondary: '#008000',
          aux: '#90EE90'
        },
        elementColors: {
          primary: '#00FF00',
          secondary: '#008000'
        },
        menuColors: {
          primary: '#00FF00',
          secondary: '#008000',
          aux: '#90EE90'
        },
        auxiliaryElementColors: {
          primary: '#00FF00',
          secondary: '#008000'
        },
        backgroundColors: {
          primary: '#FFFFFF',
          secondary: '#F0F0F0'
        }
      }
    }, {
      skipAutoDeactivate: true,
      isActive: false
    });
    createdConfigIds.push(newConfig.id);
    logSuccess(`New configuration created with ID: ${newConfig.id}`);
    logInfo(`Version Reference: ${newConfig.versionReference}`);
    logInfo(`Is Active: ${newConfig.isActive}`);

    // Step 9: Get all configurations
    logTest('Step 9: Getting all configurations...');
    const allConfigs = await configService.getAllConfigurations(testAppId);
    logSuccess(`Found ${allConfigs.length} configurations`);
    allConfigs.forEach((config, index) => {
      logInfo(`Config ${index + 1}: ${config.id} - Active: ${config.isActive}, Published: ${config.publishing.isPublished}`);
    });

    // Step 10: Publish a configuration
    logTest('Step 10: Publishing a configuration...');
    const publishedConfig = await configService.updatePublishingStatus(testAppId, true);
    logSuccess('Configuration published');
    logInfo(`Published At: ${publishedConfig.publishing.publishedAt || 'Not set'}`);

    // Step 11: Get configurations for publish UI
    logTest('Step 11: Getting configurations for publish UI...');
    const publishData = await configService.getConfigurationsForPublish(testAppId);
    logSuccess(`Found ${publishData.unpublished.length} unpublished configurations`);
    logSuccess(`Found ${publishData.previous.length} previous (published) configurations`);
    
    publishData.unpublished.forEach((config, index) => {
      logInfo(`Unpublished ${index + 1}: ${config.versionReference} - Variance: ${config.updateVariance?.join(', ') || 'None'}`);
    });
    
    publishData.previous.forEach((config, index) => {
      const status = config.isActive ? 'Current' : 'Archived';
      logInfo(`Previous ${index + 1}: ${config.versionReference} - Status: ${status} - Variance: ${config.updateVariance?.join(', ') || 'None'}`);
    });

    // Step 12: Activate a different configuration
    if (createdConfigIds.length > 0) {
      logTest('Step 12: Activating the new configuration...');
      const activatedConfig = await configService.activateConfiguration(testAppId, createdConfigIds[0]);
      logSuccess(`Configuration ${activatedConfig.id} activated`);
      logInfo(`Is Active: ${activatedConfig.isActive}`);
    }

    // Step 13: Add support component
    logTest('Step 13: Adding a support component...');
    const component = await configService.addSupportComponent(testAppId, {
      name: 'Help Center',
      type: 'link',
      content: 'https://help.test-config.com',
      color: '#007bff',
      order: 1
    });
    logSuccess(`Support component added with ID: ${component.id}`);

    // Step 14: Create a template
    logTest('Step 14: Creating a configuration template...');
    const currentConfig = await configService.getAppConfiguration(testAppId);
    const template = await configService.createTemplate(testAppId, {
      name: 'Test Template',
      description: 'A test configuration template',
      isDefault: false
    });
    logSuccess(`Template created with ID: ${template.id}`);

    // Step 15: Get templates
    logTest('Step 15: Getting all templates...');
    const templates = await configService.getTemplates(testAppId);
    logSuccess(`Found ${templates.length} templates`);

    // Step 16: Apply template
    logTest('Step 16: Applying template...');
    const appliedConfig = await configService.applyTemplate(testAppId, template.id);
    logSuccess('Template applied successfully');

    // Final summary
    log('\n' + '='.repeat(60), colors.green);
    log('All Configuration Tests Passed! ✅', colors.green);
    log('='.repeat(60) + '\n', colors.green);
    
    logInfo(`Test App ID: ${testAppId}`);
    logInfo(`Total Configurations Created: ${allConfigs.length}`);
    logInfo(`Templates Created: ${templates.length}`);

  } catch (error: any) {
    logError('Test failed!');
    console.error('Error details:', error);
    if (error.message) {
      logError(`Error message: ${error.message}`);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
testConfigurations().catch((error) => {
  logError('Fatal error in test suite');
  console.error(error);
  process.exit(1);
});


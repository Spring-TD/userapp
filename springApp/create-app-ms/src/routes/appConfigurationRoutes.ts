import { Router } from 'express';
import { AppConfigurationController } from '../controllers/appConfigurationController';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent route
const configController = new AppConfigurationController();

// Configuration endpoints
router.get('/', configController.getConfiguration);
router.get('/all', configController.getAllConfigurations);
router.get('/publish', configController.getConfigurationsForPublish);
router.put('/', configController.updateConfiguration);
router.post('/create', configController.createConfiguration);

// Publishing
router.put('/publishing', configController.updatePublishing);

// App Elements
router.put('/app-elements', configController.updateAppElements);

// App Profile
router.put('/app-profile', configController.updateAppProfile);

// Onboarding
router.put('/onboarding', configController.updateOnboarding);

// Support
router.put('/support', configController.updateSupport);

// Policy
router.put('/policy', configController.updatePolicy);

// DNS Configuration
router.put('/dns', configController.updateDnsConfig);
router.post('/dns/verify', configController.verifyDomain);

// Template endpoints
router.post('/templates', configController.createTemplate);
router.get('/templates', configController.getTemplates);
router.get('/templates/:templateId', configController.getTemplate);
router.post('/templates/:templateId/apply', configController.applyTemplate);
router.put('/templates/:templateId', configController.updateTemplate);
router.delete('/templates/:templateId', configController.deleteTemplate);
router.put('/templates/:templateId/set-default', configController.setDefaultTemplate);

// Support component endpoints
router.post('/support/components', configController.addSupportComponent);
router.put('/support/components/:componentId', configController.updateSupportComponent);
router.delete('/support/components/:componentId', configController.deleteSupportComponent);
router.put('/support/components/reorder', configController.reorderSupportComponents);

// Configuration activation (must be after all specific routes to avoid conflicts)
router.put('/:configurationId/activate', configController.activateConfiguration);

export { router as appConfigurationRoutes };


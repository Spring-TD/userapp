// Image reference interface
export interface ImageReference {
  url: string;
  altText?: string;
}

// Publishing Configuration
export interface PublishingConfig {
  isPublished: boolean;
  publishedAt?: string; // Timestamp when published
}

// Update Variance - tracks which sections were modified
export type UpdateVarianceSection = 'Splash' | 'Profile' | 'DNS' | 'Terms' | 'Onboarding' | 'Support' | 'Asset' | 'Policy';

// Complete App Configuration
export interface AppConfiguration {
  id: string;
  appId: string;
  versionReference?: string; // e.g., "App_update_1aa344"
  publishing: PublishingConfig;
  appElements: AppElementsConfig;
  appProfile?: AppProfileConfig;
  onboarding: OnboardingConfig;
  support: SupportConfig;
  policy: PolicyConfig;
  isActive: boolean;
  updateVariance?: UpdateVarianceSection[]; // Sections that were modified in this version
  createdAt: string;
  updatedAt: string;
}

// Button Colors Configuration
export interface ButtonColors {
  primary: {
    textColor: string;
    backgroundColor: string;
  };
  secondary: {
    textColor: string;
    backgroundColor: string;
  };
}

// App Elements Configuration
export interface AppElementsConfig {
  logo?: ImageReference;
  splash?: ImageReference;
  buttons: ButtonColors;
  header: {
    backgroundColor: string;
    textColor: string;
  };
  bodyText: {
    backgroundColor: string;
    textColor: string;
  };
  form: {
    primaryColor: string;
    secondaryColor: string;
  };
}

// Text Colors Configuration
export interface TextColors {
  primary: string;
  secondary: string;
}

// Background Colors Configuration
export interface BackgroundColors {
  primary: string;
  secondary: string;
}

// Color Configuration with Auxiliary
export interface ColorWithAux {
  primary: string;
  secondary: string;
  aux?: string;
}

// Color Configuration without Auxiliary
export interface ColorConfig {
  primary: string;
  secondary: string;
}

// App Profile Configuration
export interface AppProfileConfig {
  textColors: ColorWithAux; // Primary, Secondary, Aux Color
  elementColors: ColorConfig; // Primary, Secondary
  menuColors: ColorWithAux; // Primary, Secondary, Aux Color
  auxiliaryElementColors: ColorConfig; // Primary, Secondary
  backgroundColors: ColorConfig; // Primary, Secondary
}

// Splash Screen Configuration
export interface SplashScreen {
  logo?: ImageReference;
  fontFamily?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  textColors?: TextColors;
  backgroundColors?: BackgroundColors;
  primaryColor: string; // Kept for backward compatibility
  secondaryColor: string; // Kept for backward compatibility
  backgroundColor?: string; // Kept for backward compatibility
  textColor?: string; // Kept for backward compatibility
  image?: ImageReference;
}

// Onboarding Configuration
export interface OnboardingConfig {
  appComponent: {
    backgroundColor: string;
    textColor: string;
  };
  splash1: SplashScreen;
  splash2: SplashScreen;
  splash3: SplashScreen;
}

// Support Component
export interface SupportComponent {
  id: string;
  name: string;
  type: 'link' | 'button' | 'text';
  content: string;
  color?: string;
  order: number;
}

// Social Media Links
export interface SocialMedia {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
}

// Support Configuration
export interface SupportConfig {
  components: SupportComponent[];
  supportEmail?: string; // Contact email
  supportPhone?: string; // Contact phone
  supportWhatsapp?: string;
  website?: string; // Website URL
  linkedinPage?: string; // LinkedIn page URL
  socialMediaHandles?: string; // Social media handles (general field)
  privacyPolicyLink?: string; // Link to privacy policy
  termsAndConditionsLink?: string; // Link to terms and conditions
  socials: SocialMedia; // Individual social media links (Instagram, Twitter, Facebook, etc.)
}

// Policy Section Configuration
export interface PolicySection {
  title?: string;
  content?: string; // Rich text content
}

// Policy Configuration
export interface PolicyConfig {
  policy?: PolicySection; // Policy section with title and content
  terms?: PolicySection; // Terms section with title and content
  privacyPolicy?: string; // Kept for backward compatibility (URL or content)
  termsAndConditions?: string; // Kept for backward compatibility (URL or content)
  indemnity?: string; // Kept for backward compatibility (URL or content)
}


// Configuration Template
export interface ConfigurationTemplate {
  id: string;
  appId: string;
  name: string;
  description?: string;
  configuration: Omit<AppConfiguration, 'id' | 'appId' | 'isActive' | 'createdAt' | 'updatedAt'>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Request/Response Types
export interface UpdateConfigurationRequest {
  publishing?: Partial<PublishingConfig>;
  appElements?: Partial<AppElementsConfig>;
  appProfile?: Partial<AppProfileConfig>;
  onboarding?: Partial<OnboardingConfig>;
  support?: Partial<SupportConfig>;
  policy?: Partial<PolicyConfig>;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  configuration?: Partial<UpdateConfigurationRequest>;
  isDefault?: boolean;
}

export interface CreateSupportComponentRequest {
  name: string;
  type: 'link' | 'button' | 'text';
  content: string;
  color?: string;
  order?: number;
}

export interface UpdateSupportComponentRequest {
  name?: string;
  type?: 'link' | 'button' | 'text';
  content?: string;
  color?: string;
  order?: number;
}

export interface ReorderComponentsRequest {
  componentIds: string[];
}


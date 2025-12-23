import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ContractTypeEnum } from '../types/contractType';

const contractToSchema = Joi.object({
  fullName: Joi.string().trim().max(200).optional(),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required in contract_to'
  }),
  phone: Joi.string().trim().max(50).optional(),
  address: Joi.string().trim().max(500).optional(),
  user_id: Joi.string().required().messages({
    'any.required': 'user_id is required in contract_to'
  })
});

// Base schema without signature requirement
const contractFromBaseSchema = Joi.object({
  partyType: Joi.string().valid('individual', 'business').required().messages({
    'any.only': 'Party type must be either individual or business',
    'any.required': 'Party type is required'
  }),
  fullName: Joi.string().trim().required().max(200).messages({
    'any.required': 'Full name is required',
    'string.max': 'Full name cannot exceed 200 characters'
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().trim().required().max(50).messages({
    'any.required': 'Phone number is required',
    'string.max': 'Phone number cannot exceed 50 characters'
  }),
  address: Joi.string().trim().required().max(500).messages({
    'any.required': 'Address is required',
    'string.max': 'Address cannot exceed 500 characters'
  }),
  country: Joi.string().trim().required().max(100).messages({
    'any.required': 'Country is required',
    'string.max': 'Country cannot exceed 100 characters'
  }),
  designation: Joi.string().trim().required().max(200).messages({
    'any.required': 'Designation is required',
    'string.max': 'Designation cannot exceed 200 characters'
  }),
  // Business fields - conditionally required based on partyType
  businessName: Joi.when('partyType', {
    is: 'business',
    then: Joi.string().trim().required().max(300).messages({
      'any.required': 'Business name is required for business type',
      'string.max': 'Business name cannot exceed 300 characters'
    }),
    otherwise: Joi.string().trim().max(300).optional()
  }),
  businessAddress: Joi.when('partyType', {
    is: 'business',
    then: Joi.string().trim().required().max(500).messages({
      'any.required': 'Business address is required for business type',
      'string.max': 'Business address cannot exceed 500 characters'
    }),
    otherwise: Joi.string().trim().max(500).optional()
  }),
  businessEmail: Joi.when('partyType', {
    is: 'business',
    then: Joi.string().trim().email().required().messages({
      'string.email': 'Please provide a valid business email address',
      'any.required': 'Business email is required for business type'
    }),
    otherwise: Joi.string().trim().email().optional()
  }),
  businessPhone: Joi.when('partyType', {
    is: 'business',
    then: Joi.string().trim().required().max(50).messages({
      'any.required': 'Business phone is required for business type',
      'string.max': 'Business phone cannot exceed 50 characters'
    }),
    otherwise: Joi.string().trim().max(50).optional()
  }),
  companyLogo: Joi.string().trim().optional().allow('').messages({
    'string.base': 'Company logo must be a valid string'
  })
});

// Schema for contract types that DO NOT require signature (Disclaimer, Terms & Condition)
const contractFromSchemaNoSignature = contractFromBaseSchema;

// Schema for contract types that require signature (Agreement, Indemnity)
const contractFromSchemaWithSignature = contractFromBaseSchema.keys({
  signature: Joi.string().trim().required().messages({
    'string.base': 'Signature must be a valid string',
    'any.required': 'Signature is required for this contract type'
  }),
  facialCapture: Joi.string().trim().required().messages({
    'string.base': 'Facial capture must be a valid string',
    'any.required': 'Facial capture is required for this contract type'
  })
});

const createContractFormSchema = Joi.object({
  contractOrderId: Joi.string().required().messages({
    'any.required': 'Contract order ID is required'
  }),
  contract_to: contractToSchema.optional(),
  contract_from: Joi.when('contractType', [
    {
      // For Indemnity: contract_from is optional if contract_to is present
      is: ContractTypeEnum.INDEMNITY,
      then: Joi.when('contract_to', {
        is: Joi.exist(),
        then: contractFromSchemaWithSignature.optional(),
        otherwise: contractFromSchemaWithSignature.required().messages({
          'any.required': 'Contract from information is required when contract_to is not provided'
        })
      })
    },
    {
      is: Joi.valid(ContractTypeEnum.DISCLAIMER, ContractTypeEnum.TERMS_AND_CONDITION),
      then: contractFromSchemaNoSignature.required().messages({
        'any.required': 'Contract from information is required'
      })
    },
    {
      is: ContractTypeEnum.AGREEMENT,
      then: contractFromSchemaWithSignature.required().messages({
        'any.required': 'Contract from information is required'
      })
    }
  ]),
  contractName: Joi.string().trim().required().max(300).messages({
    'any.required': 'Contract name is required',
    'string.max': 'Contract name cannot exceed 300 characters'
  }),
  contractDescription: Joi.string().trim().required().max(2000).messages({
    'any.required': 'Contract description is required',
    'string.max': 'Contract description cannot exceed 2000 characters'
  }),
  contractContent: Joi.string().required().messages({
    'any.required': 'Contract content is required'
  }),
  contractType: Joi.string()
    .valid(...Object.values(ContractTypeEnum))
    .required()
    .messages({
      'any.only': `Contract type must be one of: ${Object.values(ContractTypeEnum).join(', ')}`,
      'any.required': 'Contract type is required'
    })
});

const updateContractFormSchema = Joi.object({
  contract_from: Joi.alternatives().try(
    contractFromSchemaNoSignature,
    contractFromSchemaWithSignature
  ).optional(),
  contractName: Joi.string().trim().max(300).optional().messages({
    'string.max': 'Contract name cannot exceed 300 characters'
  }),
  contractDescription: Joi.string().trim().max(2000).optional().messages({
    'string.max': 'Contract description cannot exceed 2000 characters'
  }),
  contractContent: Joi.string().optional(),
  status: Joi.string()
    .valid('draft', 'submitted', 'approved', 'rejected')
    .optional()
    .messages({
      'any.only': 'Status must be one of: draft, submitted, approved, rejected'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const validateCreateContractForm = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = createContractFormSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

export const validateUpdateContractForm = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = updateContractFormSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

import type { IProductApplicationDocument } from '../models/ProductApplicationModel';
import type {
  PlatformApplicationFieldInput,
  PlatformApplicationFieldKey,
  ValidatedPlatformApplicationFields
} from '../types/platformApplicationFields';
import { PLATFORM_APPLICATION_FIELD_KEYS } from '../types/platformApplicationFields';

function recordFrom(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function pickPlatformFieldInput(source: Record<string, unknown> | undefined): PlatformApplicationFieldInput {
  if (!source) {
    return {};
  }

  const picked: PlatformApplicationFieldInput = {};
  for (const key of PLATFORM_APPLICATION_FIELD_KEYS) {
    if (source[key] !== undefined) {
      (picked as Record<string, unknown>)[key] = source[key];
    }
  }
  return picked;
}

export function extractPlatformFieldInput(
  input: PlatformApplicationFieldInput & {
    metadata?: Record<string, unknown>;
    platformFields?: PlatformApplicationFieldInput | Record<string, unknown>;
  }
): PlatformApplicationFieldInput {
  const metadata = recordFrom(input.metadata);
  const metadataPlatformFields = recordFrom(metadata?.platformFields);
  const nestedPlatformFields = recordFrom(input.platformFields);
  return {
    ...pickPlatformFieldInput(metadataPlatformFields),
    ...pickPlatformFieldInput(nestedPlatformFields),
    // Top-level keys win over nested aliases.
    ...pickPlatformFieldInput(input as Record<string, unknown>)
  };
}

export function hasPlatformFieldInput(input: PlatformApplicationFieldInput): boolean {
  return PLATFORM_APPLICATION_FIELD_KEYS.some((key) => input[key] !== undefined);
}

export function platformFieldsFromApplication(
  application: Pick<IProductApplicationDocument, PlatformApplicationFieldKey>
): ValidatedPlatformApplicationFields {
  const fields: ValidatedPlatformApplicationFields = {};
  for (const key of PLATFORM_APPLICATION_FIELD_KEYS) {
    const value = application[key];
    if (value !== undefined && value !== null) {
      (fields as Record<string, unknown>)[key] = value;
    }
  }
  return fields;
}

export function applyPlatformFieldsToApplication(
  application: IProductApplicationDocument,
  fields: ValidatedPlatformApplicationFields
): void {
  for (const key of PLATFORM_APPLICATION_FIELD_KEYS) {
    const value = fields[key];
    if (value !== undefined) {
      application[key] = value as never;
    }
  }
}

export function mergePlatformFieldInput(
  existing: ValidatedPlatformApplicationFields,
  incoming: PlatformApplicationFieldInput
): PlatformApplicationFieldInput {
  return {
    ...platformFieldsFromApplication(existing as Pick<IProductApplicationDocument, PlatformApplicationFieldKey>),
    ...incoming
  };
}

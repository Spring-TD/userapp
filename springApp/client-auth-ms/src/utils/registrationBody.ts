import { UserRegistrationForm } from '../types/forms';

type RegistrationBodyInput = UserRegistrationForm & {
  firstName?: string;
  lastName?: string;
  name?: string;
};

/** Map common PWA / camelCase fields before Joi validation. */
export function normalizeUserRegistrationBody(body: RegistrationBodyInput): UserRegistrationForm {
  const firstName = (body.first_name ?? body.firstName ?? '').trim();
  const lastName = (body.last_name ?? body.lastName ?? '').trim();
  const fullName = (body.name ?? '').trim();

  let resolvedFirst = firstName;
  let resolvedLast = lastName;

  if (!resolvedFirst && !resolvedLast && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      resolvedFirst = parts[0];
      resolvedLast = parts[0];
    } else {
      resolvedFirst = parts[0];
      resolvedLast = parts.slice(1).join(' ');
    }
  } else if (!resolvedFirst && resolvedLast) {
    resolvedFirst = resolvedLast;
  }

  return {
    ...body,
    first_name: resolvedFirst,
    last_name: resolvedLast
  };
}

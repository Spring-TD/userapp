import { getOp, mutOp, paginationQuery } from './frontendPlataCommon';
import { schemaRef } from './frontendPlataSchemas';

export const authTeamPaths: Record<string, unknown> = {
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth & Session'],
      summary: 'Login',
      description: 'Merchant owner or invited staff. Returns JWT + `permissions[]`, `isOwner`, `roleName`.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: schemaRef('LoginRequest'),
            example: { email: 'titusdavid39+a@gmail.com', password: 'SecurePass123!' }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login success',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  schemaRef('SuccessEnvelope'),
                  { properties: { data: schemaRef('LoginData') } }
                ]
              }
            }
          }
        },
        '401': { description: 'Invalid credentials', content: { 'application/json': { schema: schemaRef('ErrorEnvelope') } } }
      }
    }
  },

  '/api/v1/auth/me': getOp({
    tags: ['Auth & Session'],
    summary: 'Current user + RBAC session',
    description: 'Primary reload endpoint: profile + permissions, roleName, isOwner.',
    dataSchema: {
      allOf: [schemaRef('SessionUser'), schemaRef('RbacSession')]
    }
  }),

  '/api/v1/auth/verify-token': mutOp('post', {
    tags: ['Auth & Session'],
    summary: 'Verify access token',
    description: 'Heartbeat / idle session touch + RBAC fields.'
  }),

  '/api/v1/auth/refresh': mutOp('post', {
    tags: ['Auth & Session'],
    summary: 'Refresh tokens',
    body: {
      type: 'object',
      properties: { refreshToken: { type: 'string' } }
    }
  }),

  '/api/v1/auth/logout': mutOp('post', {
    tags: ['Auth & Session'],
    summary: 'Logout'
  }),

  '/api/v1/password/forgot': {
    post: {
      tags: ['Auth & Session'],
      summary: 'Forgot password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email' } }
            }
          }
        }
      },
      responses: { '200': { description: 'Accepted' } }
    }
  },

  '/api/v1/password/reset': {
    post: {
      tags: ['Auth & Session'],
      summary: 'Reset password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'password'],
              properties: {
                token: { type: 'string' },
                password: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { '200': { description: 'Password reset' } }
    }
  },

  '/api/v1/password/change': mutOp('put', {
    tags: ['Auth & Session'],
    summary: 'Change password',
    body: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' }
      }
    }
  }),

  '/api/v1/user/profile': {
    ...getOp({ tags: ['Auth & Session'], summary: 'Get profile' }),
    ...mutOp('put', {
      tags: ['Auth & Session'],
      summary: 'Update profile',
      body: { type: 'object', additionalProperties: true }
    })
  },

  '/api/v1/registration/merchant': {
    post: {
      tags: ['Auth & Session'],
      summary: 'Register merchant',
      description: 'Create FI merchant owner account (onboarding).',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } }
      },
      responses: { '201': { description: 'Registered' }, '400': { description: 'Validation error' } }
    }
  },

  '/api/v1/roles/permissions': getOp({
    tags: ['Team & RBAC'],
    summary: 'Permission catalog',
    description: 'All permission codes + labels for Create Role UI. Not the current user — use `/auth/me`.',
    dataSchema: schemaRef('PermissionCatalogData')
  }),

  '/api/v1/roles': {
    ...getOp({
      tags: ['Team & RBAC'],
      summary: 'List roles',
      description: 'Merchant-scoped (not appId-filtered).',
      dataSchema: { type: 'array', items: schemaRef('Role') }
    }),
    ...mutOp('post', {
      tags: ['Team & RBAC'],
      summary: 'Create role',
      body: {
        type: 'object',
        required: ['name', 'permissions'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } }
        }
      },
      dataSchema: schemaRef('Role')
    })
  },

  '/api/v1/roles/{roleId}': {
    ...mutOp('put', {
      tags: ['Team & RBAC'],
      summary: 'Update role',
      parameters: [{ in: 'path', name: 'roleId', required: true, schema: { type: 'string' } }],
      body: { type: 'object', additionalProperties: true }
    }),
    ...mutOp('delete', {
      tags: ['Team & RBAC'],
      summary: 'Delete role',
      parameters: [{ in: 'path', name: 'roleId', required: true, schema: { type: 'string' } }]
    })
  },

  '/api/v1/roles/ensure-defaults': mutOp('post', {
    tags: ['Team & RBAC'],
    summary: 'Seed Admin / Manager / Support Staff'
  }),

  '/api/v1/invitations': {
    ...getOp({
      tags: ['Team & RBAC'],
      summary: 'List invitations',
      dataSchema: { type: 'array', items: schemaRef('Invitation') }
    }),
    ...mutOp('post', {
      tags: ['Team & RBAC'],
      summary: 'Invite staff',
      body: {
        type: 'object',
        required: ['email', 'roleId'],
        properties: {
          email: { type: 'string', format: 'email' },
          roleId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' }
        }
      },
      dataSchema: schemaRef('Invitation')
    })
  },

  '/api/v1/invitations/validate/{token}': {
    get: {
      tags: ['Team & RBAC'],
      summary: 'Validate invitation token (public)',
      parameters: [{ in: 'path', name: 'token', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Invitation details' } }
    }
  },

  '/api/v1/invitations/accept': {
    post: {
      tags: ['Team & RBAC'],
      summary: 'Accept invitation (public)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'password'],
              properties: {
                token: { type: 'string' },
                password: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { '200': { description: 'Joined' } }
    }
  },

  '/api/v1/team/members': getOp({
    tags: ['Team & RBAC'],
    summary: 'List team members',
    description:
      'Merchant-scoped staff list. Query `status`: omit/current | deactivated | all | active | pending | suspended.',
    parameters: [
      {
        in: 'query',
        name: 'status',
        schema: {
          type: 'string',
          enum: ['current', 'deactivated', 'all', 'active', 'pending', 'suspended']
        }
      }
    ],
    dataSchema: { type: 'array', items: schemaRef('TeamMember') }
  }),

  '/api/v1/team/members/{userId}/role': mutOp('put', {
    tags: ['Team & RBAC'],
    summary: 'Change staff role',
    parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
    body: {
      type: 'object',
      required: ['roleId'],
      properties: { roleId: { type: 'string' } }
    }
  }),

  '/api/v1/team/members/{userId}/suspend': mutOp('put', {
    tags: ['Team & RBAC'],
    summary: 'Suspend staff',
    parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/team/members/{userId}/activate': mutOp('put', {
    tags: ['Team & RBAC'],
    summary: 'Activate staff',
    parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/team/members/{userId}/deactivate': mutOp('put', {
    tags: ['Team & RBAC'],
    summary: 'Deactivate / remove staff',
    parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/team/activity-logs': getOp({
    tags: ['Team & RBAC'],
    summary: 'Team activity audit log',
    parameters: paginationQuery
  }),

  '/api/v1/keys': {
    ...getOp({
      tags: ['API Keys'],
      summary: 'List merchant API keys',
      description: 'Settings → keys used by backends (`PLATA_PUBLIC_KEY` / `PLATA_SECRET_KEY`).',
      dataSchema: { type: 'array', items: schemaRef('ApiKey') }
    }),
    ...mutOp('post', {
      tags: ['API Keys'],
      summary: 'Create API key pair',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          environment: { type: 'string', enum: ['test', 'live'] }
        }
      },
      dataSchema: schemaRef('ApiKey')
    })
  },

  '/api/v1/keys/{keyId}': mutOp('delete', {
    tags: ['API Keys'],
    summary: 'Revoke API key',
    parameters: [{ in: 'path', name: 'keyId', required: true, schema: { type: 'string' } }]
  })
};

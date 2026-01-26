# Role Management API

This document describes the role management endpoints available to merchants in the service-auth-ms microservice.

## Overview

Merchants can now create, view, update, and delete roles for their organization. Each role contains a set of permissions that define what actions users assigned to that role can perform.

## Endpoints

### 1. Get Available Permissions

**GET** `/api/v1/roles/permissions`

Returns all available permissions that can be assigned to roles.

**Authentication:** Required (any authenticated user)

**Response:**
```json
{
  "success": true,
  "data": {
    "permissions": [
      "create_admin",
      "generate_secret_keys",
      "see_secret_keys",
      "edit_products",
      "create_products",
      "view_products",
      "change_password",
      "see_billing",
      "add_payment_method",
      "edit_payment_method",
      "create_app",
      "see_activity_log",
      "download_report"
    ]
  }
}
```

---

### 2. Create a Role

**POST** `/api/v1/roles`

Creates a new role for the merchant's organization.

**Authentication:** Required (Merchant only)

**Request Body:**
```json
{
  "name": "Manager",
  "description": "Manager with operational access",
  "permissions": [
    "view_products",
    "edit_products",
    "create_products",
    "see_billing",
    "create_app"
  ]
}
```

**Validation:**
- `name`: Required, 3-50 characters
- `description`: Required, max 255 characters
- `permissions`: Required array, must contain at least 1 valid permission

**Response:**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "id": "uuid-here",
      "name": "Manager",
      "description": "Manager with operational access",
      "permissions": ["view_products", "edit_products", ...],
      "merchant_id": "merchant-id",
      "created_at": "2025-12-10T10:00:00.000Z",
      "updated_at": "2025-12-10T10:00:00.000Z"
    }
  }
}
```

---

### 3. Get All Roles

**GET** `/api/v1/roles`

Retrieves all roles for the authenticated merchant.

**Authentication:** Required (Merchant only)

**Response:**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "uuid-1",
        "name": "Admin",
        "description": "Administrator with full access",
        "permissions": ["create_admin", "generate_secret_keys", ...],
        "merchant_id": "merchant-id",
        "created_at": "2025-12-10T09:00:00.000Z",
        "updated_at": "2025-12-10T09:00:00.000Z"
      },
      {
        "id": "uuid-2",
        "name": "Manager",
        "description": "Manager with operational access",
        "permissions": ["view_products", "edit_products", ...],
        "merchant_id": "merchant-id",
        "created_at": "2025-12-10T10:00:00.000Z",
        "updated_at": "2025-12-10T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. Update a Role

**PUT** `/api/v1/roles/:roleId`

Updates an existing role. Only the merchant who created the role can update it.

**Authentication:** Required (Merchant only)

**URL Parameters:**
- `roleId`: The UUID of the role to update

**Request Body:**
```json
{
  "name": "Senior Manager",
  "description": "Senior manager with extended access",
  "permissions": [
    "view_products",
    "edit_products",
    "create_products",
    "see_billing",
    "add_payment_method",
    "create_app",
    "see_activity_log"
  ]
}
```

**Validation:**
- Same as Create Role
- Role must exist and belong to the authenticated merchant

**Response:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "role": {
      "id": "uuid-here",
      "name": "Senior Manager",
      "description": "Senior manager with extended access",
      "permissions": ["view_products", "edit_products", ...],
      "merchant_id": "merchant-id",
      "created_at": "2025-12-10T10:00:00.000Z",
      "updated_at": "2025-12-10T11:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `404`: Role not found
- `403`: You do not have permission to update this role
- `400`: Validation failed

---

### 5. Delete a Role

**DELETE** `/api/v1/roles/:roleId`

Deletes a role. Only the merchant who created the role can delete it. Roles cannot be deleted if users are currently assigned to them.

**Authentication:** Required (Merchant only)

**URL Parameters:**
- `roleId`: The UUID of the role to delete

**Response:**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Error Responses:**
- `404`: Role not found
- `403`: You do not have permission to delete this role
- `400`: Cannot delete role: X user(s) are currently assigned to this role

---

## Default Roles

When the service starts, three default roles are automatically created for the default merchant (`merchant@example.com`):

1. **Admin** - Full access to all permissions
2. **Manager** - Operational access (products, billing, apps, activity logs)
3. **Support** - Read-only access (view products, activity logs, billing)

## Default Users

Three invited users are also created with these roles:
- `merchant-admin@example.com` (Admin role)
- `merchant-manager@example.com` (Manager role)
- `merchant-support@example.com` (Support role)

All default users have the password: `DefaultPass123!`

## Permission Descriptions

| Permission | Description |
|-----------|-------------|
| `create_admin` | Create admin users |
| `generate_secret_keys` | Generate API secret keys |
| `see_secret_keys` | View API secret keys |
| `edit_products` | Edit existing products |
| `create_products` | Create new products |
| `view_products` | View products |
| `change_password` | Change user passwords |
| `see_billing` | View billing information |
| `add_payment_method` | Add payment methods |
| `edit_payment_method` | Edit payment methods |
| `create_app` | Create new applications |
| `see_activity_log` | View activity logs |
| `download_report` | Download reports |

## Notes

- All role operations require merchant authentication
- Roles are scoped to the merchant who created them
- Users can only be assigned roles from their own merchant organization
- Deleting a role requires that no users are currently assigned to it
- Role updates are immediate and affect all users assigned to that role

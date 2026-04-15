# API Endpoints & Swagger Documentation

## API Structure

All API routes follow RESTful conventions under `/api/v1/`

## Authentication

All endpoints require authentication via Supabase Auth.

```typescript
// Middleware for role checking
export function requireRole(allowedRoles: Role[]) {
  return async (req: NextRequest) => {
    const session = await getSession(req);
    if (!session || !allowedRoles.includes(session.user.role)) {
      return new Response('Forbidden', { status: 403 });
    }
  };
}
```

## API Endpoints

### 1. Authentication

#### POST /api/v1/auth/login
Login with email and password

**Request Body:**
```json
{
  "email": "admin@school.com",
  "password": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "employeeId": "uuid",
      "name": "System Administrator",
      "email": "admin@school.com",
      "role": "ADMIN"
    },
    "token": "jwt-token"
  }
}
```

#### POST /api/v1/auth/logout
Logout current user

#### GET /api/v1/auth/me
Get current user info

---

### 2. Employees (Admin Only)

#### GET /api/v1/employees
List all employees with pagination

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional)
- `role` (ADMIN | CASHIER, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### POST /api/v1/employees
Create new employee

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@school.com",
  "role": "CASHIER"
}
```

#### PUT /api/v1/employees/:id
Update employee

#### DELETE /api/v1/employees/:id
Delete employee

#### POST /api/v1/employees/:id/reset-password
Reset employee password to default (123456)

---

### 3. Students (Admin: Full, Cashier: Read)

#### GET /api/v1/students
List students with pagination and filters

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `search` (string) - Search by NIS, NIK, name
- `startJoinDateFrom` (date)
- `startJoinDateTo` (date)

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "nis": "2024001",
        "nik": "3578123456789012",
        "name": "Ahmad Rizki",
        "address": "Jl. Merdeka No. 123",
        "parentName": "Budi Santoso",
        "parentPhone": "081234567890",
        "startJoinDate": "2024-07-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/v1/students
Create single student (Admin only)

#### PUT /api/v1/students/:nis
Update student (Admin only)

#### DELETE /api/v1/students/:nis
Delete student (Admin only)

#### POST /api/v1/students/import
Mass import students from Excel (Admin only)

**Request:** multipart/form-data
- `file`: Excel file (.xlsx)

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "updated": 5,
    "errors": [
      {
        "row": 12,
        "nis": "2024012",
        "error": "Duplicate NIK"
      }
    ]
  }
}
```

#### POST /api/v1/students/export
Export students to Excel

**Request Body:**
```json
{
  "filters": {
    "search": "Ahmad"
  }
}
```

**Response:** Excel file download

#### GET /api/v1/students/template
Download Excel import template

---

### 4. Academic Years (Admin Only)

#### GET /api/v1/academic-years
List all academic years

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `isActive` (boolean)

#### POST /api/v1/academic-years
Create academic year

**Request Body:**
```json
{
  "year": "2025/2026",
  "startDate": "2025-07-01",
  "endDate": "2026-06-30",
  "isActive": true
}
```

#### PUT /api/v1/academic-years/:id
Update academic year

#### DELETE /api/v1/academic-years/:id
Delete academic year

#### POST /api/v1/academic-years/:id/set-active
Set academic year as active (deactivates others)

---

### 5. Class Academics (Admin Only)

#### GET /api/v1/class-academics
List classes with filters

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `academicYearId` (string)
- `grade` (number 1-12)
- `search` (string) - Search className

**Response:**
```json
{
  "success": true,
  "data": {
    "classes": [
      {
        "id": "uuid",
        "academicYearId": "uuid",
        "grade": 12,
        "section": "IPA",
        "className": "XII-IPA-2024/2025",
        "academicYear": {
          "year": "2024/2025"
        },
        "_count": {
          "tuitions": 30,
          "scholarships": 5
        }
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/v1/class-academics
Create single class

**Request Body:**
```json
{
  "academicYearId": "uuid",
  "grade": 12,
  "section": "IPA"
}
```

#### POST /api/v1/class-academics/import
Mass import classes

**Request:** multipart/form-data
- `file`: Excel file

#### PUT /api/v1/class-academics/:id
Update class

#### DELETE /api/v1/class-academics/:id
Delete class

#### GET /api/v1/class-academics/template
Download Excel template

---

### 6. Tuitions (Admin Only for Generation/Edit)

#### GET /api/v1/tuitions
List tuitions with filters

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `classAcademicId` (string)
- `studentNis` (string)
- `status` (UNPAID | PAID | PARTIAL)
- `month` (JULY - JUNE)
- `year` (number)
- `dueDateFrom` (date)
- `dueDateTo` (date)

#### POST /api/v1/tuitions/generate
Generate tuitions for a class

**Request Body:**
```json
{
  "classAcademicId": "uuid",
  "feeAmount": 500000,
  "studentNisList": ["2024001", "2024002"], // Optional - if empty, all students
  "startMonth": "JULY", // Optional - default JULY
  "startYear": 2024 // Optional - default current academic year
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generated": 360, // 30 students × 12 months
    "skipped": 120, // Students joined mid-year
    "details": {
      "totalStudents": 30,
      "monthsGenerated": 12
    }
  }
}
```

**Business Logic:**
1. Get all students in class (or specified students)
2. For each student:
   - Get their `startJoinDate`
   - Generate tuitions from their join month to June
   - Skip months before join date
3. Check for existing tuitions (don't duplicate)
4. Set due date: 10th of each month
5. Auto-apply scholarships if exist

#### POST /api/v1/tuitions/generate-bulk
Generate for multiple classes at once

**Request Body:**
```json
{
  "classes": [
    {
      "classAcademicId": "uuid-1",
      "feeAmount": 500000
    },
    {
      "classAcademicId": "uuid-2",
      "feeAmount": 600000
    }
  ]
}
```

#### GET /api/v1/tuitions/:id
Get single tuition details

#### PUT /api/v1/tuitions/:id
Update tuition (Admin only)

#### DELETE /api/v1/tuitions/:id
Delete tuition (Admin only)

---

### 7. Scholarships (Admin Only)

#### GET /api/v1/scholarships
List scholarships

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `classAcademicId` (string)
- `studentNis` (string)
- `isFullScholarship` (boolean)

#### POST /api/v1/scholarships
Create single scholarship

**Request Body:**
```json
{
  "studentNis": "2024001",
  "classAcademicId": "uuid",
  "nominal": 500000
}
```

**Business Logic:**
1. Check if nominal >= monthly fee → Set `isFullScholarship = true`
2. If full scholarship:
   - Find all UNPAID tuitions for this student in this class
   - Mark them as PAID with paidAmount = feeAmount
   - Create system payment records

#### POST /api/v1/scholarships/import
Mass import scholarships

**Request:** multipart/form-data
- `file`: Excel file

**Excel Columns:**
- Student NIS (dropdown)
- Class Academic (dropdown)
- Nominal (number)

#### DELETE /api/v1/scholarships/:id
Delete scholarship

**Note:** Deleting scholarship does NOT revert auto-paid tuitions

---

### 8. Payments (Admin & Cashier)

#### GET /api/v1/payments
List payments

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `studentNis` (string)
- `classAcademicId` (string)
- `employeeId` (string)
- `paymentDateFrom` (date)
- `paymentDateTo` (date)

#### POST /api/v1/payments
Create payment

**Request Body:**
```json
{
  "tuitionId": "uuid",
  "amount": 500000,
  "notes": "Cash payment"
}
```

**Business Logic:**
1. Validate tuition exists and is UNPAID/PARTIAL
2. Add amount to tuition.paidAmount
3. Update tuition status:
   - If paidAmount >= feeAmount → PAID
   - Else → PARTIAL
4. Record payment with current employee ID

#### GET /api/v1/payments/:id
Get payment details

#### DELETE /api/v1/payments/:id
Delete payment (Admin only, reverses the payment)

---

### 9. Reports (Admin & Cashier Read)

#### GET /api/v1/reports/overdue
Get overdue payments report

**Query Parameters:**
- `classAcademicId` (string, optional)
- `grade` (number, optional)
- `academicYearId` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "overdue": [
      {
        "student": {
          "nis": "2024001",
          "name": "Ahmad Rizki",
          "parentPhone": "081234567890"
        },
        "class": {
          "className": "XII-IPA-2024/2025",
          "grade": 12,
          "section": "IPA"
        },
        "overdueMonths": [
          {
            "month": "JULY",
            "year": 2024,
            "feeAmount": 500000,
            "paidAmount": 0,
            "dueDate": "2024-07-10",
            "daysOverdue": 45
          }
        ],
        "totalOverdue": 1500000,
        "overdueCount": 3
      }
    ],
    "summary": {
      "totalStudents": 25,
      "totalOverdueAmount": 37500000,
      "totalOverdueRecords": 75
    }
  }
}
```

#### GET /api/v1/reports/overdue/export
Export overdue report to Excel

#### GET /api/v1/reports/class-summary
Class-wise payment summary

**Query Parameters:**
- `academicYearId` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "class": {
        "id": "uuid",
        "className": "XII-IPA-2024/2025",
        "grade": 12
      },
      "statistics": {
        "totalStudents": 30,
        "totalTuitions": 360,
        "paid": 300,
        "unpaid": 50,
        "partial": 10,
        "totalFees": 180000000,
        "totalPaid": 150000000,
        "totalOutstanding": 30000000
      }
    }
  ]
}
```

#### GET /api/v1/reports/fee-service-summary
Fee service (transport + accommodation) aggregated summary

**Query Parameters:**
- `academicYearId` (string, optional)
- `category` ("TRANSPORT" | "ACCOMMODATION", optional)
- `feeServiceId` (string, optional)
- `billStatus` ("UNPAID" | "PARTIAL" | "PAID" | "VOID", optional)
- `classId` (string, optional)
- `monthFrom`, `monthTo` ("YYYY-MM", optional)
- `search` (string, optional)
- `page`, `limit` (number, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "feeServiceId": "uuid",
        "feeServiceName": "Bus Route A",
        "category": "TRANSPORT",
        "activeStudents": 24,
        "totalBilled": "12000000",
        "totalPaid": "8000000",
        "outstanding": "4000000",
        "overdueBills": 3
      }
    ],
    "total": 8,
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "totals": { "billed": "…", "paid": "…", "outstanding": "…" }
  }
}
```

#### GET /api/v1/reports/fee-service-summary/export
Export fee service summary to Excel (honors the same filters).

#### GET /api/v1/reports/payment-history
Payment history report

**Query Parameters:**
- `startDate` (date)
- `endDate` (date)
- `employeeId` (string, optional)
- `classAcademicId` (string, optional)

---

## Swagger Configuration

### File: `src/lib/swagger.ts`

```typescript
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api/v1',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'School Tuition Management API',
        version: '1.0.0',
        description: 'API documentation for School Tuition Management System',
      },
      servers: [
        {
          url: 'http://localhost:3000/api/v1',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  return spec;
};
```

### Swagger UI Route: `src/app/api-docs/page.tsx`

```typescript
'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  return <SwaggerUI url="/api/swagger" />;
}
```

### Swagger JSON Route: `src/app/api/swagger/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}
```

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {} // Optional additional info
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `DUPLICATE_ENTRY` (409)
- `SERVER_ERROR` (500)

## API Response Wrapper

```typescript
// src/lib/api-response.ts

export function successResponse<T>(data: T, statusCode = 200) {
  return Response.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

export function errorResponse(
  message: string,
  code: string,
  statusCode = 400,
  details?: unknown
) {
  return Response.json(
    {
      success: false,
      error: {
        message,
        code,
        ...(details && { details }),
      },
    },
    { status: statusCode }
  );
}
```

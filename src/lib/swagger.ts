import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api/v1",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "SkolFi API",
        version: "1.0.0",
        description:
          "API documentation for SkolFi — school tuition management system",
      },
      servers: [
        {
          url: "http://localhost:3000/api/v1",
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  code: { type: "string" },
                },
              },
            },
          },
          Pagination: {
            type: "object",
            properties: {
              page: { type: "number" },
              limit: { type: "number" },
              total: { type: "number" },
              totalPages: { type: "number" },
            },
          },
          Employee: {
            type: "object",
            properties: {
              employeeId: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              role: { type: "string", enum: ["ADMIN", "CASHIER"] },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          Student: {
            type: "object",
            properties: {
              nis: { type: "string" },
              nik: { type: "string" },
              name: { type: "string" },
              address: { type: "string" },
              parentName: { type: "string" },
              parentPhone: { type: "string" },
              startJoinDate: { type: "string", format: "date-time" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          AcademicYear: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              year: { type: "string", example: "2025/2026" },
              startDate: { type: "string", format: "date" },
              endDate: { type: "string", format: "date" },
              isActive: { type: "boolean" },
            },
          },
          ClassAcademic: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              academicYearId: { type: "string", format: "uuid" },
              grade: { type: "number", minimum: 1, maximum: 12 },
              section: { type: "string" },
              className: { type: "string" },
            },
          },
          Tuition: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              classAcademicId: { type: "string", format: "uuid" },
              studentId: { type: "string" },
              month: {
                type: "string",
                enum: [
                  "JULY",
                  "AUGUST",
                  "SEPTEMBER",
                  "OCTOBER",
                  "NOVEMBER",
                  "DECEMBER",
                  "JANUARY",
                  "FEBRUARY",
                  "MARCH",
                  "APRIL",
                  "MAY",
                  "JUNE",
                ],
              },
              year: { type: "number" },
              feeAmount: { type: "number" },
              paidAmount: { type: "number" },
              status: {
                type: "string",
                enum: ["UNPAID", "PAID", "PARTIAL"],
              },
              dueDate: { type: "string", format: "date" },
            },
          },
          Scholarship: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              studentId: { type: "string" },
              classAcademicId: { type: "string", format: "uuid" },
              nominal: { type: "number" },
              isFullScholarship: { type: "boolean" },
            },
          },
          Payment: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              tuitionId: { type: "string", format: "uuid" },
              employeeId: { type: "string", format: "uuid" },
              amount: { type: "number" },
              paymentDate: { type: "string", format: "date-time" },
              notes: { type: "string" },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      paths: {
        "/auth/login": {
          post: {
            tags: ["Authentication"],
            summary: "Login with email and password",
            security: [],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                      email: {
                        type: "string",
                        example: "admin@school.com",
                      },
                      password: { type: "string", example: "123456" },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Login successful",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            user: { $ref: "#/components/schemas/Employee" },
                            token: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Invalid credentials",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                  },
                },
              },
            },
          },
        },
        "/auth/logout": {
          post: {
            tags: ["Authentication"],
            summary: "Logout current user",
            responses: {
              "200": { description: "Logout successful" },
            },
          },
        },
        "/auth/me": {
          get: {
            tags: ["Authentication"],
            summary: "Get current user info",
            responses: {
              "200": {
                description: "Current user",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/Employee" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/employees": {
          get: {
            tags: ["Employees"],
            summary: "List all employees with pagination",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              {
                name: "search",
                in: "query",
                schema: { type: "string" },
              },
              {
                name: "role",
                in: "query",
                schema: { type: "string", enum: ["ADMIN", "CASHIER"] },
              },
            ],
            responses: {
              "200": {
                description: "List of employees",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            employees: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/Employee",
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Employees"],
            summary: "Create new employee",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name", "email"],
                    properties: {
                      name: { type: "string" },
                      email: { type: "string", format: "email" },
                      role: {
                        type: "string",
                        enum: ["ADMIN", "CASHIER"],
                        default: "CASHIER",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Employee created",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/Employee" },
                      },
                    },
                  },
                },
              },
              "409": {
                description: "Email already exists",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                  },
                },
              },
            },
          },
        },
        "/employees/{id}": {
          get: {
            tags: ["Employees"],
            summary: "Get employee by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": {
                description: "Employee details",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/Employee" },
                      },
                    },
                  },
                },
              },
              "404": {
                description: "Employee not found",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                  },
                },
              },
            },
          },
          put: {
            tags: ["Employees"],
            summary: "Update employee",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      email: { type: "string", format: "email" },
                      role: {
                        type: "string",
                        enum: ["ADMIN", "CASHIER"],
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Employee updated",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/Employee" },
                      },
                    },
                  },
                },
              },
            },
          },
          delete: {
            tags: ["Employees"],
            summary: "Delete employee",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Employee deleted" },
              "400": {
                description: "Cannot delete own account",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                  },
                },
              },
            },
          },
        },
        "/employees/{id}/reset-password": {
          post: {
            tags: ["Employees"],
            summary: "Reset employee password to default (123456)",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Password reset successful" },
              "404": {
                description: "Employee not found",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                  },
                },
              },
            },
          },
        },
        "/students": {
          get: {
            tags: ["Students"],
            summary: "List students with pagination and search",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              {
                name: "search",
                in: "query",
                description: "Search by NIS, NIK, or name",
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "List of students",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            students: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/Student",
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Students"],
            summary: "Create a new student (Admin only)",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: [
                      "nis",
                      "nik",
                      "name",
                      "address",
                      "parentName",
                      "parentPhone",
                      "startJoinDate",
                    ],
                    properties: {
                      nis: { type: "string" },
                      nik: { type: "string", minLength: 16, maxLength: 16 },
                      name: { type: "string" },
                      address: { type: "string" },
                      parentName: { type: "string" },
                      parentPhone: { type: "string" },
                      startJoinDate: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Student created",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/Student" },
                      },
                    },
                  },
                },
              },
              "409": {
                description: "Duplicate NIS or NIK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                  },
                },
              },
            },
          },
        },
        "/students/{nis}": {
          get: {
            tags: ["Students"],
            summary: "Get student by NIS",
            parameters: [
              {
                name: "nis",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "Student details",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/Student" },
                      },
                    },
                  },
                },
              },
              "404": {
                description: "Student not found",
              },
            },
          },
          put: {
            tags: ["Students"],
            summary: "Update student (Admin only)",
            parameters: [
              {
                name: "nis",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      nik: { type: "string" },
                      name: { type: "string" },
                      address: { type: "string" },
                      parentName: { type: "string" },
                      parentPhone: { type: "string" },
                      startJoinDate: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Student updated",
              },
            },
          },
          delete: {
            tags: ["Students"],
            summary: "Delete student (Admin only)",
            parameters: [
              {
                name: "nis",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { description: "Student deleted" },
            },
          },
        },
        "/students/import": {
          post: {
            tags: ["Students"],
            summary: "Mass import students from Excel (Admin only)",
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    properties: {
                      file: {
                        type: "string",
                        format: "binary",
                        description: "Excel file (.xlsx)",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Import results",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            imported: { type: "number" },
                            updated: { type: "number" },
                            errors: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  row: { type: "number" },
                                  nis: { type: "string" },
                                  error: { type: "string" },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/students/template": {
          get: {
            tags: ["Students"],
            summary: "Download Excel import template",
            responses: {
              "200": {
                description: "Excel file download",
                content: {
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                    {
                      schema: {
                        type: "string",
                        format: "binary",
                      },
                    },
                },
              },
            },
          },
        },
        "/academic-years": {
          get: {
            tags: ["Academic Years"],
            summary: "List academic years",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              { name: "isActive", in: "query", schema: { type: "boolean" } },
            ],
            responses: {
              "200": {
                description: "List of academic years",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            academicYears: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/AcademicYear",
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Academic Years"],
            summary: "Create academic year (Admin only)",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["year", "startDate", "endDate"],
                    properties: {
                      year: { type: "string", example: "2025/2026" },
                      startDate: { type: "string", format: "date-time" },
                      endDate: { type: "string", format: "date-time" },
                      isActive: { type: "boolean", default: false },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Academic year created" },
              "409": { description: "Academic year already exists" },
            },
          },
        },
        "/academic-years/{id}": {
          get: {
            tags: ["Academic Years"],
            summary: "Get academic year by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Academic year details" },
              "404": { description: "Not found" },
            },
          },
          put: {
            tags: ["Academic Years"],
            summary: "Update academic year",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      year: { type: "string" },
                      startDate: { type: "string", format: "date-time" },
                      endDate: { type: "string", format: "date-time" },
                      isActive: { type: "boolean" },
                    },
                  },
                },
              },
            },
            responses: { "200": { description: "Academic year updated" } },
          },
          delete: {
            tags: ["Academic Years"],
            summary: "Delete academic year",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Deleted" },
              "400": { description: "Has existing classes" },
            },
          },
        },
        "/academic-years/{id}/set-active": {
          post: {
            tags: ["Academic Years"],
            summary: "Set academic year as active",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: { "200": { description: "Academic year activated" } },
          },
        },
        "/class-academics": {
          get: {
            tags: ["Classes"],
            summary: "List classes with filters",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              {
                name: "academicYearId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              {
                name: "grade",
                in: "query",
                schema: { type: "number", minimum: 1, maximum: 12 },
              },
              { name: "search", in: "query", schema: { type: "string" } },
            ],
            responses: {
              "200": {
                description: "List of classes",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            classes: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/ClassAcademic",
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Classes"],
            summary: "Create class (Admin only)",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["academicYearId", "grade", "section"],
                    properties: {
                      academicYearId: { type: "string", format: "uuid" },
                      grade: { type: "number", minimum: 1, maximum: 12 },
                      section: { type: "string", example: "IPA" },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Class created" },
              "409": { description: "Duplicate class" },
            },
          },
        },
        "/class-academics/{id}": {
          get: {
            tags: ["Classes"],
            summary: "Get class by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Class details" },
              "404": { description: "Not found" },
            },
          },
          put: {
            tags: ["Classes"],
            summary: "Update class",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      academicYearId: { type: "string", format: "uuid" },
                      grade: { type: "number" },
                      section: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: { "200": { description: "Class updated" } },
          },
          delete: {
            tags: ["Classes"],
            summary: "Delete class",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Deleted" },
              "400": { description: "Has existing tuitions" },
            },
          },
        },
        "/class-academics/import": {
          post: {
            tags: ["Classes"],
            summary: "Import classes from Excel (Admin only)",
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    properties: {
                      file: {
                        type: "string",
                        format: "binary",
                        description: "Excel file (.xlsx)",
                      },
                    },
                  },
                },
              },
            },
            responses: { "200": { description: "Import results" } },
          },
        },
        "/class-academics/template": {
          get: {
            tags: ["Classes"],
            summary: "Download class import template",
            responses: {
              "200": {
                description: "Excel file download",
                content: {
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                    {
                      schema: { type: "string", format: "binary" },
                    },
                },
              },
            },
          },
        },
        "/tuitions": {
          get: {
            tags: ["Tuitions"],
            summary: "List tuitions with filters",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              {
                name: "classAcademicId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              { name: "studentId", in: "query", schema: { type: "string" } },
              {
                name: "status",
                in: "query",
                schema: { type: "string", enum: ["UNPAID", "PAID", "PARTIAL"] },
              },
              {
                name: "month",
                in: "query",
                schema: {
                  type: "string",
                  enum: [
                    "JULY",
                    "AUGUST",
                    "SEPTEMBER",
                    "OCTOBER",
                    "NOVEMBER",
                    "DECEMBER",
                    "JANUARY",
                    "FEBRUARY",
                    "MARCH",
                    "APRIL",
                    "MAY",
                    "JUNE",
                  ],
                },
              },
            ],
            responses: {
              "200": {
                description: "List of tuitions",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            tuitions: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Tuition" },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/tuitions/{id}": {
          get: {
            tags: ["Tuitions"],
            summary: "Get tuition by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Tuition details" },
              "404": { description: "Not found" },
            },
          },
          put: {
            tags: ["Tuitions"],
            summary: "Update tuition (Admin only)",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      feeAmount: { type: "number" },
                      dueDate: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            responses: { "200": { description: "Tuition updated" } },
          },
          delete: {
            tags: ["Tuitions"],
            summary: "Delete tuition (Admin only)",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Deleted" },
              "400": { description: "Has existing payments" },
            },
          },
        },
        "/tuitions/generate": {
          post: {
            tags: ["Tuitions"],
            summary: "Generate tuitions for a class (Admin only)",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["classAcademicId", "feeAmount"],
                    properties: {
                      classAcademicId: { type: "string", format: "uuid" },
                      feeAmount: { type: "number", example: 500000 },
                      studentIdList: {
                        type: "array",
                        items: { type: "string" },
                        description: "Optional: specific students",
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Generation results",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            generated: { type: "number" },
                            skipped: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/tuitions/generate-bulk": {
          post: {
            tags: ["Tuitions"],
            summary: "Generate tuitions for multiple classes (Admin only)",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["classes"],
                    properties: {
                      classes: {
                        type: "array",
                        items: {
                          type: "object",
                          required: ["classAcademicId", "feeAmount"],
                          properties: {
                            classAcademicId: { type: "string", format: "uuid" },
                            feeAmount: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            responses: { "200": { description: "Bulk generation results" } },
          },
        },
        "/scholarships": {
          get: {
            tags: ["Scholarships"],
            summary: "List scholarships",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              {
                name: "classAcademicId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              { name: "studentId", in: "query", schema: { type: "string" } },
              {
                name: "isFullScholarship",
                in: "query",
                schema: { type: "boolean" },
              },
            ],
            responses: {
              "200": {
                description: "List of scholarships",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            scholarships: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/Scholarship",
                              },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Scholarships"],
            summary: "Create scholarship (Admin only)",
            description:
              "Creates a scholarship. Full scholarships auto-pay all unpaid tuitions.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["studentId", "classAcademicId", "nominal"],
                    properties: {
                      studentId: { type: "string" },
                      classAcademicId: { type: "string", format: "uuid" },
                      nominal: { type: "number", example: 500000 },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Scholarship created" },
              "409": { description: "Duplicate scholarship" },
            },
          },
        },
        "/scholarships/{id}": {
          delete: {
            tags: ["Scholarships"],
            summary: "Delete scholarship (Admin only)",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: { "200": { description: "Deleted" } },
          },
        },
        "/scholarships/import": {
          post: {
            tags: ["Scholarships"],
            summary: "Import scholarships from Excel (Admin only)",
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    properties: {
                      file: {
                        type: "string",
                        format: "binary",
                        description: "Excel file (.xlsx)",
                      },
                    },
                  },
                },
              },
            },
            responses: { "200": { description: "Import results" } },
          },
        },
        "/payments": {
          get: {
            tags: ["Payments"],
            summary: "List payments",
            parameters: [
              {
                name: "page",
                in: "query",
                schema: { type: "number", default: 1 },
              },
              {
                name: "limit",
                in: "query",
                schema: { type: "number", default: 10 },
              },
              { name: "studentId", in: "query", schema: { type: "string" } },
              {
                name: "classAcademicId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              {
                name: "employeeId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              {
                name: "paymentDateFrom",
                in: "query",
                schema: { type: "string", format: "date" },
              },
              {
                name: "paymentDateTo",
                in: "query",
                schema: { type: "string", format: "date" },
              },
            ],
            responses: {
              "200": {
                description: "List of payments",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            payments: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Payment" },
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Payments"],
            summary: "Create payment",
            description:
              "Process a payment for a tuition. Updates tuition status automatically.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["tuitionId", "amount"],
                    properties: {
                      tuitionId: { type: "string", format: "uuid" },
                      amount: { type: "number", example: 500000 },
                      notes: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Payment created",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            payment: { $ref: "#/components/schemas/Payment" },
                            newStatus: {
                              type: "string",
                              enum: ["UNPAID", "PARTIAL", "PAID"],
                            },
                            remainingAmount: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "400": { description: "Invalid tuition or already paid" },
            },
          },
        },
        "/payments/{id}": {
          get: {
            tags: ["Payments"],
            summary: "Get payment by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": { description: "Payment details" },
              "404": { description: "Not found" },
            },
          },
          delete: {
            tags: ["Payments"],
            summary: "Delete/reverse payment (Admin only)",
            description: "Deletes a payment and reverts the tuition status.",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: { "200": { description: "Payment reversed" } },
          },
        },
        "/reports/overdue": {
          get: {
            tags: ["Reports"],
            summary: "Get overdue payments report",
            parameters: [
              {
                name: "classAcademicId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              {
                name: "grade",
                in: "query",
                schema: { type: "number", minimum: 1, maximum: 12 },
              },
              {
                name: "academicYearId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": {
                description: "Overdue report",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            overdue: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  student: {
                                    type: "object",
                                    properties: {
                                      nis: { type: "string" },
                                      name: { type: "string" },
                                      parentPhone: { type: "string" },
                                    },
                                  },
                                  class: {
                                    type: "object",
                                    properties: {
                                      className: { type: "string" },
                                      grade: { type: "number" },
                                    },
                                  },
                                  overdueMonths: {
                                    type: "array",
                                    items: { type: "object" },
                                  },
                                  totalOverdue: { type: "number" },
                                  overdueCount: { type: "number" },
                                },
                              },
                            },
                            summary: {
                              type: "object",
                              properties: {
                                totalStudents: { type: "number" },
                                totalOverdueAmount: { type: "number" },
                                totalOverdueRecords: { type: "number" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/reports/overdue/export": {
          get: {
            tags: ["Reports"],
            summary: "Export overdue report to Excel",
            parameters: [
              {
                name: "classAcademicId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
              { name: "grade", in: "query", schema: { type: "number" } },
              {
                name: "academicYearId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": {
                description: "Excel file download",
                content: {
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                    {
                      schema: { type: "string", format: "binary" },
                    },
                },
              },
            },
          },
        },
        "/reports/class-summary": {
          get: {
            tags: ["Reports"],
            summary: "Get class payment summary",
            parameters: [
              {
                name: "academicYearId",
                in: "query",
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              "200": {
                description: "Class summary report",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            classes: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  class: {
                                    type: "object",
                                    properties: {
                                      id: { type: "string" },
                                      className: { type: "string" },
                                      grade: { type: "number" },
                                    },
                                  },
                                  statistics: {
                                    type: "object",
                                    properties: {
                                      totalStudents: { type: "number" },
                                      totalTuitions: { type: "number" },
                                      paid: { type: "number" },
                                      unpaid: { type: "number" },
                                      partial: { type: "number" },
                                      totalFees: { type: "number" },
                                      totalPaid: { type: "number" },
                                      totalOutstanding: { type: "number" },
                                    },
                                  },
                                },
                              },
                            },
                            totals: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/dashboard/stats": {
          get: {
            tags: ["Dashboard"],
            summary: "Get dashboard statistics",
            responses: {
              "200": {
                description: "Dashboard statistics",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            totalStudents: { type: "number" },
                            totalEmployees: { type: "number" },
                            activeAcademicYear: { type: "string" },
                            monthlyRevenue: { type: "number" },
                            monthlyPaymentsCount: { type: "number" },
                            overdueTuitions: { type: "number" },
                            totalOutstanding: { type: "number" },
                            tuitionStats: {
                              type: "object",
                              properties: {
                                paid: { type: "number" },
                                unpaid: { type: "number" },
                                partial: { type: "number" },
                                total: { type: "number" },
                              },
                            },
                            recentPayments: {
                              type: "array",
                              items: { type: "object" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return spec;
};

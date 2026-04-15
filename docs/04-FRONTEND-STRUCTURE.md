# Frontend Structure - Next.js 14 App Router with Mantine UI

## Directory Structure

```
src/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Auth layout group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Protected dashboard layout
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── students/
│   │   │   ├── page.tsx
│   │   │   ├── [nis]/
│   │   │   │   └── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── import/
│   │   │       └── page.tsx
│   │   ├── academic-years/
│   │   │   ├── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── classes/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── import/
│   │   │       └── page.tsx
│   │   ├── tuitions/
│   │   │   ├── page.tsx
│   │   │   └── generate/
│   │   │       └── page.tsx
│   │   ├── scholarships/
│   │   │   ├── page.tsx
│   │   │   └── import/
│   │   │       └── page.tsx
│   │   ├── payments/
│   │   │   ├── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   └── reports/
│   │       ├── overdue/
│   │       │   └── page.tsx
│   │       └── class-summary/
│   │           └── page.tsx
│   ├── api/
│   │   └── v1/                   # API routes (see 03-API-ENDPOINTS.md)
│   ├── api-docs/                 # Swagger UI
│   │   └── page.tsx
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # Global providers
│
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   │   ├── DataTable/
│   │   │   └── DataTable.tsx     # Reusable table with MRT
│   │   ├── PageHeader/
│   │   │   └── PageHeader.tsx
│   │   ├── StatCard/
│   │   │   └── StatCard.tsx
│   │   ├── LoadingOverlay/
│   │   │   └── LoadingOverlay.tsx
│   │   └── ExcelUploader/
│   │       └── ExcelUploader.tsx
│   ├── layouts/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── AuthLayout.tsx
│   ├── forms/
│   │   ├── EmployeeForm.tsx
│   │   ├── StudentForm.tsx
│   │   ├── AcademicYearForm.tsx
│   │   ├── ClassAcademicForm.tsx
│   │   ├── TuitionGeneratorForm.tsx
│   │   ├── ScholarshipImportForm.tsx
│   │   └── PaymentForm.tsx
│   ├── tables/
│   │   ├── EmployeeTable.tsx
│   │   ├── StudentTable.tsx
│   │   ├── ClassAcademicTable.tsx
│   │   ├── TuitionTable.tsx
│   │   ├── ScholarshipTable.tsx
│   │   └── PaymentTable.tsx
│   └── modals/
│       ├── ConfirmModal.tsx
│       └── ImportModal.tsx
│
├── hooks/                        # Custom React hooks
│   ├── api/                      # API hooks using TanStack Query
│   │   ├── useEmployees.ts
│   │   ├── useStudents.ts
│   │   ├── useAcademicYears.ts
│   │   ├── useClassAcademics.ts
│   │   ├── useTuitions.ts
│   │   ├── useScholarships.ts
│   │   ├── usePayments.ts
│   │   └── useReports.ts
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── useExcelExport.ts
│   └── useQueryFilters.ts         # URL-persisted filters + pagination
│
├── lib/                          # Utilities & configurations
│   ├── api-client.ts             # Axios/Fetch wrapper
│   ├── query-keys.ts             # Query key factory
│   ├── supabase.ts               # Supabase client
│   ├── prisma.ts                 # Prisma client
│   ├── swagger.ts                # Swagger config
│   ├── excel-utils.ts            # Excel import/export
│   ├── validators.ts             # Zod schemas
│   └── utils.ts                  # Helper functions
│
├── store/                        # Zustand stores
│   ├── auth-store.ts             # Auth state
│   ├── ui-store.ts               # UI state (modals, etc)
│   └── filter-store.ts           # Filter state
│
└── types/                        # TypeScript types
    ├── api.types.ts              # API request/response types
    ├── database.types.ts         # Database types
    └── index.ts                  # Barrel exports
```

## Key Components

### 1. Root Layout (`app/layout.tsx`)

```typescript
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import Providers from './providers';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <MantineProvider>
            <ModalsProvider>
              <Notifications position="top-right" />
              {children}
            </ModalsProvider>
          </MantineProvider>
        </Providers>
      </body>
    </html>
  );
}
```

### 2. Global Providers (`app/providers.tsx`)

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3. Dashboard Layout (`app/(dashboard)/layout.tsx`)

```typescript
'use client';

import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Sidebar from '@/components/layouts/Sidebar';
import Header from '@/components/layouts/Header';
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) redirect('/login');

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Header
          mobileOpened={mobileOpened}
          desktopOpened={desktopOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleDesktop}
        />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
```

### 4. Sidebar Component (`components/layouts/Sidebar.tsx`)

```typescript
'use client';

import { NavLink } from '@mantine/core';
import {
  IconUsers,
  IconSchool,
  IconCalendar,
  IconBuilding,
  IconCash,
  IconGift,
  IconReceipt,
  IconReportAnalytics,
  IconHome,
} from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const adminLinks = [
  { icon: IconHome, label: 'Dashboard', href: '/' },
  { icon: IconUsers, label: 'Employees', href: '/employees' },
  { icon: IconSchool, label: 'Students', href: '/students' },
  { icon: IconCalendar, label: 'Academic Years', href: '/academic-years' },
  { icon: IconBuilding, label: 'Classes', href: '/classes' },
  { icon: IconCash, label: 'Tuitions', href: '/tuitions' },
  { icon: IconGift, label: 'Scholarships', href: '/scholarships' },
  { icon: IconReceipt, label: 'Payments', href: '/payments' },
  { icon: IconReportAnalytics, label: 'Reports', href: '/reports/overdue' },
];

const cashierLinks = [
  { icon: IconHome, label: 'Dashboard', href: '/' },
  { icon: IconSchool, label: 'Students', href: '/students' },
  { icon: IconReceipt, label: 'Payments', href: '/payments' },
  { icon: IconReportAnalytics, label: 'Reports', href: '/reports/overdue' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = user?.role === 'ADMIN' ? adminLinks : cashierLinks;

  return (
    <nav>
      {links.map((link) => (
        <NavLink
          key={link.href}
          component={Link}
          href={link.href}
          label={link.label}
          leftSection={<link.icon size={20} />}
          active={pathname === link.href}
        />
      ))}
    </nav>
  );
}
```

### 5. Reusable Data Table (`components/ui/DataTable/DataTable.tsx`)

```typescript
'use client';

import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_ColumnFiltersState,
  type MRT_SortingState,
} from 'mantine-react-table';
import { useState } from 'react';

interface DataTableProps<T extends Record<string, any>> {
  columns: MRT_ColumnDef<T>[];
  data: T[];
  totalRows: number;
  isLoading?: boolean;
  onPaginationChange?: (pagination: MRT_PaginationState) => void;
  onColumnFiltersChange?: (filters: MRT_ColumnFiltersState) => void;
  onSortingChange?: (sorting: MRT_SortingState) => void;
  enableRowActions?: boolean;
  renderRowActions?: (row: T) => React.ReactNode;
  enableTopToolbar?: boolean;
  renderTopToolbarCustomActions?: () => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  totalRows,
  isLoading = false,
  onPaginationChange,
  onColumnFiltersChange,
  onSortingChange,
  enableRowActions = false,
  renderRowActions,
  enableTopToolbar = true,
  renderTopToolbarCustomActions,
}: DataTableProps<T>) {
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<MRT_SortingState>([]);

  const table = useMantineReactTable({
    columns,
    data,
    rowCount: totalRows,
    state: {
      isLoading,
      pagination,
      columnFilters,
      sorting,
      showProgressBars: isLoading,
    },
    enableRowActions,
    renderRowActions: renderRowActions
      ? ({ row }) => renderRowActions(row.original)
      : undefined,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    onColumnFiltersChange: (updater) => {
      const newFilters =
        typeof updater === 'function' ? updater(columnFilters) : updater;
      setColumnFilters(newFilters);
      onColumnFiltersChange?.(newFilters);
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      onSortingChange?.(newSorting);
    },
    enableTopToolbar,
    renderTopToolbarCustomActions,
  });

  return <MantineReactTable table={table} />;
}
```

### 6. Employee Table Example (`components/tables/EmployeeTable.tsx`)

```typescript
'use client';

import { DataTable } from '@/components/ui/DataTable/DataTable';
import { useEmployees } from '@/hooks/api/useEmployees';
import { ActionIcon, Badge, Group } from '@mantine/core';
import { IconEdit, IconTrash, IconKey } from '@tabler/icons-react';
import { type MRT_ColumnDef } from 'mantine-react-table';
import { Employee } from '@/types';
import { useState } from 'react';

export default function EmployeeTable() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState<any>({});

  const { data, isLoading } = useEmployees({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...filters,
  });

  const columns: MRT_ColumnDef<Employee>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      Cell: ({ cell }) => (
        <Badge color={cell.getValue() === 'ADMIN' ? 'blue' : 'green'}>
          {cell.getValue() as string}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.employees || []}
      totalRows={data?.pagination.total || 0}
      isLoading={isLoading}
      onPaginationChange={setPagination}
      enableRowActions
      renderRowActions={(row) => (
        <Group gap="xs">
          <ActionIcon variant="subtle" color="blue">
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="orange">
            <IconKey size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red">
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      )}
    />
  );
}
```

### 7. Student Form with React Hook Form (`components/forms/StudentForm.tsx`)

```typescript
'use client';

import { useForm, zodResolver } from '@mantine/form';
import { TextInput, Textarea, Button, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { z } from 'zod';

const studentSchema = z.object({
  nis: z.string().min(1, 'NIS is required'),
  nik: z.string().length(16, 'NIK must be 16 digits'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  parentName: z.string().min(1, 'Parent name is required'),
  parentPhone: z.string().min(10, 'Phone must be at least 10 digits'),
  startJoinDate: z.date({ required_error: 'Start date is required' }),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  initialData?: Partial<StudentFormValues>;
  onSubmit: (data: StudentFormValues) => void;
  isLoading?: boolean;
}

export default function StudentForm({
  initialData,
  onSubmit,
  isLoading,
}: StudentFormProps) {
  const form = useForm({
    initialValues: {
      nis: initialData?.nis || '',
      nik: initialData?.nik || '',
      name: initialData?.name || '',
      address: initialData?.address || '',
      parentName: initialData?.parentName || '',
      parentPhone: initialData?.parentPhone || '',
      startJoinDate: initialData?.startJoinDate || new Date(),
    },
    validate: zodResolver(studentSchema),
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput
          label="NIS (Student ID)"
          placeholder="2024001"
          required
          {...form.getInputProps('nis')}
        />
        <TextInput
          label="NIK (National ID)"
          placeholder="3578123456789012"
          required
          maxLength={16}
          {...form.getInputProps('nik')}
        />
        <TextInput
          label="Student Name"
          placeholder="Ahmad Rizki"
          required
          {...form.getInputProps('name')}
        />
        <Textarea
          label="Address"
          placeholder="Jl. Merdeka No. 123"
          required
          {...form.getInputProps('address')}
        />
        <TextInput
          label="Parent Name"
          placeholder="Budi Santoso"
          required
          {...form.getInputProps('parentName')}
        />
        <TextInput
          label="Parent Phone"
          placeholder="081234567890"
          required
          {...form.getInputProps('parentPhone')}
        />
        <DatePickerInput
          label="Start Join Date"
          placeholder="Select date"
          required
          {...form.getInputProps('startJoinDate')}
        />
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Student' : 'Create Student'}
        </Button>
      </Stack>
    </form>
  );
}
```

## Page Examples

### Students Page (`app/(dashboard)/students/page.tsx`)

```typescript
'use client';

import { Button, Group } from '@mantine/core';
import { IconPlus, IconFileUpload } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import StudentTable from '@/components/tables/StudentTable';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import { usePermissions } from '@/hooks/usePermissions';

export default function StudentsPage() {
  const router = useRouter();
  const { canCreate } = usePermissions();

  return (
    <>
      <PageHeader
        title="Students"
        description="Manage student records"
        actions={
          canCreate && (
            <Group>
              <Button
                leftSection={<IconFileUpload size={18} />}
                variant="light"
                onClick={() => router.push('/students/import')}
              >
                Import Excel
              </Button>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => router.push('/students/new')}
              >
                Add Student
              </Button>
            </Group>
          )
        }
      />
      <StudentTable />
    </>
  );
}
```

### Payment Processing Page (`app/(dashboard)/payments/new/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import {
  Paper,
  Stack,
  Select,
  NumberInput,
  Textarea,
  Button,
  Text,
  Group,
  Badge,
} from '@mantine/core';
import { useStudents } from '@/hooks/api/useStudents';
import { useTuitions } from '@/hooks/api/useTuitions';
import { useCreatePayment } from '@/hooks/api/usePayments';
import { notifications } from '@mantine/notifications';

export default function NewPaymentPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedTuition, setSelectedTuition] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const { data: students } = useStudents({ limit: 1000 });
  const { data: tuitions } = useTuitions({
    studentNis: selectedStudent || undefined,
    status: 'UNPAID',
  });

  const createPayment = useCreatePayment();

  const handleSubmit = () => {
    if (!selectedTuition || !amount) return;

    createPayment.mutate(
      {
        tuitionId: selectedTuition,
        amount,
        notes,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Success',
            message: 'Payment recorded successfully',
            color: 'green',
          });
          // Reset form
          setSelectedStudent(null);
          setSelectedTuition(null);
          setAmount(0);
          setNotes('');
        },
      }
    );
  };

  const selectedTuitionData = tuitions?.tuitions.find(
    (t) => t.id === selectedTuition
  );

  return (
    <Paper p="lg" withBorder>
      <Stack gap="md">
        <Text size="xl" fw={700}>
          Process Payment
        </Text>

        <Select
          label="Select Student"
          placeholder="Choose student"
          data={
            students?.students.map((s) => ({
              value: s.nis,
              label: `${s.nis} - ${s.name}`,
            })) || []
          }
          value={selectedStudent}
          onChange={setSelectedStudent}
          searchable
        />

        {selectedStudent && (
          <Select
            label="Select Tuition"
            placeholder="Choose unpaid tuition"
            data={
              tuitions?.tuitions.map((t) => ({
                value: t.id,
                label: `${t.month} ${t.year} - ${t.classAcademic.className}`,
              })) || []
            }
            value={selectedTuition}
            onChange={setSelectedTuition}
          />
        )}

        {selectedTuitionData && (
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text>Class:</Text>
                <Text fw={600}>{selectedTuitionData.classAcademic.className}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Period:</Text>
                <Text fw={600}>
                  {selectedTuitionData.month} {selectedTuitionData.year}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text>Fee Amount:</Text>
                <Text fw={600}>
                  Rp {selectedTuitionData.feeAmount.toLocaleString('id-ID')}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text>Already Paid:</Text>
                <Text fw={600}>
                  Rp {selectedTuitionData.paidAmount.toLocaleString('id-ID')}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text>Outstanding:</Text>
                <Text fw={600} c="red">
                  Rp{' '}
                  {(
                    selectedTuitionData.feeAmount - selectedTuitionData.paidAmount
                  ).toLocaleString('id-ID')}
                </Text>
              </Group>
            </Stack>
          </Paper>
        )}

        <NumberInput
          label="Payment Amount"
          placeholder="Enter amount"
          value={amount}
          onChange={(val) => setAmount(Number(val))}
          prefix="Rp "
          thousandSeparator=","
          disabled={!selectedTuition}
        />

        <Textarea
          label="Notes (Optional)"
          placeholder="Payment notes"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Button
          onClick={handleSubmit}
          loading={createPayment.isPending}
          disabled={!selectedTuition || !amount}
        >
          Process Payment
        </Button>
      </Stack>
    </Paper>
  );
}
```

## Styling Configuration

### Mantine Theme (`src/lib/theme.ts`)

```typescript
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  colors: {
    // Custom colors
  },
});
```

## Role-Based Permissions

### usePermissions Hook (`hooks/usePermissions.ts`)

```typescript
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';

  return {
    canCreate: isAdmin,
    canUpdate: isAdmin,
    canDelete: isAdmin,
    canProcessPayment: isAdmin || isCashier,
    canViewReports: isAdmin || isCashier,
    canManageEmployees: isAdmin,
    canGenerateTuition: isAdmin,
    canManageScholarships: isAdmin,
  };
}
```

## URL-Persisted Filters (`hooks/useQueryFilters.ts`)

All admin list/report pages persist filter + pagination state in the URL via
`useQueryFilters`. Each page defines a Zod schema describing its filter keys.

```typescript
import { z } from "zod";
import { useQueryFilters } from "@/hooks/useQueryFilters";

const filterSchema = z.object({
  academicYearId: z.string().optional(),
  classAcademicId: z.string().optional(),
  search: z.string().optional(),
});

const { filters, page, drafts, setFilter, setFilters, setPage } =
  useQueryFilters({ schema: filterSchema, defaultLimit: 10 });
```

**Guarantees:**
- Filter keys live in the URL query string — refresh, back/forward, and links
  restore state.
- Changing any filter resets `page` to 1; changing `page` never clears filters.
- Keys matching `search`/`q` are debounced (300ms). `drafts[key]` exposes the
  live input value for controlled inputs while URL writes are deferred.
- Values equal to defaults are pruned from the URL.
- Arrays are comma-separated (`?categories=TRANSPORT,ACCOMMODATION`).

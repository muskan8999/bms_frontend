/**
 * Domain models for BuildRent.
 *
 * These shapes mirror what a REST/SQL backend would return, so swapping the
 * mock store for real API calls later should not require UI changes.
 */

export type Unit = "piece" | "set" | "bundle" | "other";


export type PaymentStatus = "paid" | "pending" | "partial";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerCreateApiResponse = {
  success: boolean;
  message: string;
  customer: Customer;
};

export type CustomersListApiResponse = {
  success:boolean;
  message?: string;
  result: {
    customers: Customer[];
    totalCustomers: number;
    totalPages: number;
    currentPage: number;
  };
}

export type Material = {
  id: string;
  name: string;
  totalStock?: number;
  dailyRentalRate: number;
  isActive: boolean;
  description?: string;
  totalUnits:number;
  availableUnits:number; 
  createdAt: string;
  updatedAt: string;
};
export type MaterialApiResponse = {
  success: boolean;
  message: string;
  material: Material;
};

export type MaterialsListApiResponse = {
  success:boolean;
  message?:string;
  materialData:{
    materials: Material[]
    totalMaterials: number;
    totalPages: number;
    currentPage: number;
  }
}
export type DeletedMaterial = {
  id: string;
  name: string;
  totalUnits: number;
  availableUnits: number;
  dailyRentalRate: number | string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeleteMaterialApiResponse = {
  success: boolean;
  message: string;
  deletedMaterial: DeletedMaterial;
};
export type RentalStatus =| "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING";
export type RentalDisplayStatus = "active"| "returned" | "cancelled" | "overdue" | "draft";

export type Rental = {
  id: string;
  customerId: string;
  materialId: string;
  quantity: number;
  startDate: string;
  endDate: string | null;
  dailyRentalRate: number | string;
  totalAmount: number | string | null;
  status: RentalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  material: Material;
};

export type RentalCreateApiResponse = {
  success: boolean;
  message: string;
  rental: Rental;
};

export type RentalsData = {
  rentals: Rental[];
  totalRentals: number;
  totalPages: number;
  currentPage: number;
};

export type RentalsApiResponse = {
  success: boolean;
  message: string;
  rentalData: RentalsData;
};



/** Audit trail so the shop can see when a daily rate was changed and by whom. */
export type RateChange = {
  id: string;
  materialId: string;
  previousRate: number;
  newRate: number;
  changedAt: string;
  changedBy: string;
};

export type RentalItem = {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  returnedQuantity: number;
  /** Snapshot of the material's daily rate at the moment the rental was created. */
  dailyRate: number;
  unit: Unit;
};


export type ReturnRecord = {
  id: string;
  rentalId: string;
  materialId: string;
  materialName: string;
  quantity: number;
  returnDate: string;
  notes?: string;
};

export type Invoice = {
  id: string;
  rentalId: string;
  customerId: string;
  issueDate: string;
  returnDate: string;
  totalDays: number;
  subtotal: number;
  damageCharges: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
};

/** One printable line on an invoice. Derived, never stored twice. */
export type InvoiceLine = {
  materialName: string;
  quantity: number;
  unit: Unit;
  dailyRate: number;
  days: number;
  amount: number;
};

export type TimelineEvent = {
  id: string;
  type:
    | "created"
    | "issued"
    | "partial-return"
    | "final-return"
    | "invoice"
    | "payment"
    | "cancelled";
  title: string;
  description?: string;
  date: string;
};

export type DayCountConvention = "exclusive" | "inclusive";

export type Settings = {
  shopName: string;
  address: string;
  phone: string;
  gstNumber?: string;
  invoicePrefix: string;
  currency: "INR";
  dayCountConvention: DayCountConvention;
  minimumBillableDays: number;
  defaultPaymentStatus: PaymentStatus;
  invoiceNotes: string;
  units: Unit[];
  categories: string[];
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
};

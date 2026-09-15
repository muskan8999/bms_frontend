"use client";

/**
 * Single source of truth for the prototype.
 *
 * Every mutation the UI performs goes through one of the actions below. When a
 * real backend arrives, replace the bodies of these actions with API calls and
 * the pages stay untouched.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import type {
  Customer,
  Invoice,
  Material,
  PaymentStatus,
  RateChange,
  Rental,
  RentalItem,
  ReturnRecord,
  Settings,
} from "@/types";
import {
  buildInvoiceLines,
  calculateInvoiceTotal,
  calculateRemainingQuantity,
  calculateRentalDays,
  paymentStatusFor,
  rentedQuantityForMaterial,
} from "@/lib/calculations";
import {
  defaultSettings,
  mockCustomers,
  mockInvoices,
  mockMaterials,
  mockRateChanges,
  mockRentals,
  mockReturns,
} from "@/lib/mock-data";
import { makeId, uid } from "@/lib/utils";

const STORAGE_KEY = "buildrent:state:v1";

export type AppState = {
  customers: Customer[];
  materials: Material[];
  rentals: Rental[];
  returns: ReturnRecord[];
  invoices: Invoice[];
  rateChanges: RateChange[];
  settings: Settings;
};

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "reset" }
  | { type: "set"; state: Partial<AppState> };

function nextSequence(ids: string[], prefix: string, start: number) {
  const numbers = ids
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.split("-")[1]))
    .filter((value) => Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) + 1 : start;
}

/** Keeps availableStock honest no matter how the data was seeded or edited. */
function reconcileStock(state: AppState): AppState {
  return {
    ...state,
    materials: state.materials.map((material) => {
      const rented = rentedQuantityForMaterial(material.id, state.rentals);
      return { ...material, availableStock: Math.max(0, material.totalStock - rented) };
    }),
  };
}

function initialState(): AppState {
  return reconcileStock({
    customers: mockCustomers,
    materials: mockMaterials,
    rentals: mockRentals,
    returns: mockReturns,
    invoices: mockInvoices,
    rateChanges: mockRateChanges,
    settings: defaultSettings,
  });
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "reset":
      return initialState();
    case "set":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

type NewRentalInput = {
  customerId: string;
  issueDate: string;
  expectedReturnDate?: string;
  notes?: string;
  items: { materialId: string; quantity: number }[];
  asDraft?: boolean;
};

type ReturnInput = {
  rentalId: string;
  returnDate: string;
  lines: { materialId: string; quantity: number }[];
  damageCharges?: number;
  additionalCharges?: number;
  discount?: number;
  notes?: string;
};

type ReturnResult = {
  fullyReturned: boolean;
  invoiceId?: string;
  returnedCount: number;
};

type AppStore = {
  state: AppState;
  ready: boolean;
  addCustomer: (input: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, input: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addMaterial: (
    input: Omit<Material, "id" | "createdAt" | "updatedAt" | "availableStock" | "isActive"> & {
      isActive?: boolean;
    },
  ) => Material;
  updateMaterial: (id: string, input: Partial<Material>, changedBy?: string) => void;
  deleteMaterial: (id: string) => void;
  createRental: (input: NewRentalInput) => Rental;
  issueDraft: (rentalId: string) => void;
  updateRental: (id: string, input: Partial<Rental>) => void;
  cancelRental: (id: string) => void;
  recordReturn: (input: ReturnInput) => ReturnResult;
  recordPayment: (invoiceId: string, amount: number) => void;
  markInvoicePaid: (invoiceId: string) => void;
  updateSettings: (input: Partial<Settings>) => void;
  resetData: () => void;
  // selectors
  customerById: (id?: string) => Customer | undefined;
  materialById: (id?: string) => Material | undefined;
  rentalById: (id?: string) => Rental | undefined;
  invoiceForRental: (rentalId: string) => Invoice | undefined;
  returnsForRental: (rentalId: string) => ReturnRecord[];
  rentalsForCustomer: (customerId: string) => Rental[];
  invoicesForCustomer: (customerId: string) => Invoice[];
  rentalsForMaterial: (materialId: string) => Rental[];
  rateChangesForMaterial: (materialId: string) => RateChange[];
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);

  // Hydrate after mount so server and client render the same first paint.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        if (parsed?.materials && parsed?.rentals) {
          dispatch({
            type: "hydrate",
            state: { ...initialState(), ...parsed, settings: { ...defaultSettings, ...parsed.settings } },
          });
        }
      }
    } catch {
      // Corrupt storage just falls back to seed data.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — the session still works in memory.
    }
  }, [state, ready]);

  const set = useCallback((partial: Partial<AppState>) => {
    dispatch({ type: "set", state: partial });
  }, []);

  const dayOptions = useMemo(
    () => ({
      convention: state.settings.dayCountConvention,
      minimumBillableDays: state.settings.minimumBillableDays,
    }),
    [state.settings.dayCountConvention, state.settings.minimumBillableDays],
  );

  const addCustomer: AppStore["addCustomer"] = useCallback(
    (input) => {
      const customer: Customer = {
        ...input,
        id: makeId("CUS", nextSequence(state.customers.map((c) => c.id), "CUS", 1)),
        createdAt: new Date().toISOString(),
      };
      set({ customers: [customer, ...state.customers] });
      return customer;
    },
    [state.customers, set],
  );

  const updateCustomer: AppStore["updateCustomer"] = useCallback(
    (id, input) => {
      set({
        customers: state.customers.map((customer) =>
          customer.id === id ? { ...customer, ...input } : customer,
        ),
      });
    },
    [state.customers, set],
  );

  const deleteCustomer: AppStore["deleteCustomer"] = useCallback(
    (id) => {
      set({ customers: state.customers.filter((customer) => customer.id !== id) });
    },
    [state.customers, set],
  );

  const addMaterial: AppStore["addMaterial"] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const material: Material = {
        ...input,
        isActive: input.isActive ?? true,
        id: makeId("MAT", nextSequence(state.materials.map((m) => m.id), "MAT", 1)),
        availableStock: input.totalStock,
        createdAt: now,
        updatedAt: now,
      };
      set({ materials: [material, ...state.materials] });
      return material;
    },
    [state.materials, set],
  );

  const updateMaterial: AppStore["updateMaterial"] = useCallback(
    (id, input, changedBy = "Admin") => {
      const existing = state.materials.find((material) => material.id === id);
      if (!existing) return;

      const rented = rentedQuantityForMaterial(id, state.rentals);
      const totalStock = input.totalStock ?? existing.totalStock;

      const updated: Material = {
        ...existing,
        ...input,
        totalStock,
        availableStock: Math.max(0, totalStock - rented),
        updatedAt: new Date().toISOString(),
      };

      const rateChanged =
        typeof input.dailyRate === "number" && input.dailyRate !== existing.dailyRate;

      set({
        materials: state.materials.map((material) => (material.id === id ? updated : material)),
        rateChanges: rateChanged
          ? [
              {
                id: `RC-${uid()}`,
                materialId: id,
                previousRate: existing.dailyRate,
                newRate: input.dailyRate as number,
                changedAt: new Date().toISOString(),
                changedBy,
              },
              ...state.rateChanges,
            ]
          : state.rateChanges,
      });
    },
    [state.materials, state.rentals, state.rateChanges, set],
  );

  const deleteMaterial: AppStore["deleteMaterial"] = useCallback(
    (id) => {
      set({ materials: state.materials.filter((material) => material.id !== id) });
    },
    [state.materials, set],
  );

  /**
   * Creates a rental and takes the stock off the shelf.
   * The current daily rate is copied onto each line here — this snapshot is what
   * makes later rate changes invisible to existing rentals.
   */
  const createRental: AppStore["createRental"] = useCallback(
    (input) => {
      const id = makeId("REN", nextSequence(state.rentals.map((r) => r.id), "REN", 1001));
      const items: RentalItem[] = input.items.map((line, index) => {
        const material = state.materials.find((m) => m.id === line.materialId)!;
        return {
          id: `RI-${id}-${index + 1}`,
          materialId: material.id,
          materialName: material.name,
          quantity: line.quantity,
          returnedQuantity: 0,
          dailyRate: material.dailyRate,
          unit: material.unit,
        };
      });

      const rental: Rental = {
        id,
        customerId: input.customerId,
        items,
        issueDate: input.issueDate,
        expectedReturnDate: input.expectedReturnDate || undefined,
        notes: input.notes,
        status: input.asDraft ? "draft" : "active",
        createdAt: new Date().toISOString(),
      };

      const rentals = [rental, ...state.rentals];
      set({
        rentals,
        materials: state.materials.map((material) => ({
          ...material,
          availableStock: Math.max(0, material.totalStock - rentedQuantityForMaterial(material.id, rentals)),
        })),
      });
      return rental;
    },
    [state.rentals, state.materials, set],
  );

  const issueDraft: AppStore["issueDraft"] = useCallback(
    (rentalId) => {
      const rentals = state.rentals.map((rental) =>
        rental.id === rentalId ? { ...rental, status: "active" as const } : rental,
      );
      set({
        rentals,
        materials: state.materials.map((material) => ({
          ...material,
          availableStock: Math.max(0, material.totalStock - rentedQuantityForMaterial(material.id, rentals)),
        })),
      });
    },
    [state.rentals, state.materials, set],
  );

  const updateRental: AppStore["updateRental"] = useCallback(
    (id, input) => {
      const rentals = state.rentals.map((rental) =>
        rental.id === id ? { ...rental, ...input } : rental,
      );
      set({
        rentals,
        materials: state.materials.map((material) => ({
          ...material,
          availableStock: Math.max(0, material.totalStock - rentedQuantityForMaterial(material.id, rentals)),
        })),
      });
    },
    [state.rentals, state.materials, set],
  );

  const cancelRental: AppStore["cancelRental"] = useCallback(
    (id) => {
      const rentals = state.rentals.map((rental) =>
        rental.id === id ? { ...rental, status: "cancelled" as const } : rental,
      );
      set({
        rentals,
        materials: state.materials.map((material) => ({
          ...material,
          availableStock: Math.max(0, material.totalStock - rentedQuantityForMaterial(material.id, rentals)),
        })),
      });
    },
    [state.rentals, state.materials, set],
  );

  /**
   * Records a return. Handles both the partial case (some material stays out,
   * rental remains active) and the final case (everything is back → close the
   * rental, stamp the actual return date and raise the invoice).
   */
  const recordReturn: AppStore["recordReturn"] = useCallback(
    (input) => {
      const rental = state.rentals.find((r) => r.id === input.rentalId);
      if (!rental) return { fullyReturned: false, returnedCount: 0 };

      const returnedCount = input.lines.reduce((sum, line) => sum + line.quantity, 0);

      const items = rental.items.map((item) => {
        const line = input.lines.find((l) => l.materialId === item.materialId);
        if (!line || line.quantity <= 0) return item;
        return {
          ...item,
          returnedQuantity: Math.min(item.quantity, item.returnedQuantity + line.quantity),
        };
      });

      const fullyReturned = items.every((item) => calculateRemainingQuantity(item) === 0);

      const updatedRental: Rental = {
        ...rental,
        items,
        status: fullyReturned ? "returned" : rental.status,
        actualReturnDate: fullyReturned ? input.returnDate : rental.actualReturnDate,
      };

      const newReturns: ReturnRecord[] = input.lines
        .filter((line) => line.quantity > 0)
        .map((line) => {
          const item = rental.items.find((i) => i.materialId === line.materialId);
          return {
            id: `RET-${uid()}`,
            rentalId: rental.id,
            materialId: line.materialId,
            materialName: item?.materialName ?? line.materialId,
            quantity: line.quantity,
            returnDate: input.returnDate,
            notes: input.notes,
          };
        });

      const rentals = state.rentals.map((r) => (r.id === rental.id ? updatedRental : r));

      let invoices = state.invoices;
      let invoiceId: string | undefined;

      if (fullyReturned) {
        const lines = buildInvoiceLines(updatedRental, input.returnDate, dayOptions);
        const totals = calculateInvoiceTotal({
          lines,
          damageCharges: input.damageCharges,
          additionalCharges: input.additionalCharges,
          discount: input.discount,
        });
        invoiceId = makeId(
          state.settings.invoicePrefix,
          nextSequence(state.invoices.map((i) => i.id), state.settings.invoicePrefix, 1),
        );
        const invoice: Invoice = {
          id: invoiceId,
          rentalId: rental.id,
          customerId: rental.customerId,
          issueDate: rental.issueDate,
          returnDate: input.returnDate,
          totalDays: calculateRentalDays(rental.issueDate, input.returnDate, dayOptions),
          subtotal: totals.subtotal,
          damageCharges: totals.damageCharges,
          additionalCharges: totals.additionalCharges,
          discount: totals.discount,
          totalAmount: totals.totalAmount,
          paidAmount: state.settings.defaultPaymentStatus === "paid" ? totals.totalAmount : 0,
          status: state.settings.defaultPaymentStatus === "paid" ? "paid" : "pending",
          notes: input.notes,
          createdAt: new Date().toISOString(),
        };
        invoices = [invoice, ...state.invoices];
      }

      set({
        rentals,
        returns: [...newReturns, ...state.returns],
        invoices,
        materials: state.materials.map((material) => ({
          ...material,
          availableStock: Math.max(0, material.totalStock - rentedQuantityForMaterial(material.id, rentals)),
        })),
      });

      return { fullyReturned, invoiceId, returnedCount };
    },
    [state, dayOptions, set],
  );

  const recordPayment: AppStore["recordPayment"] = useCallback(
    (invoiceId, amount) => {
      set({
        invoices: state.invoices.map((invoice) => {
          if (invoice.id !== invoiceId) return invoice;
          const paidAmount = Math.min(invoice.totalAmount, invoice.paidAmount + amount);
          return {
            ...invoice,
            paidAmount,
            status: paymentStatusFor(invoice.totalAmount, paidAmount) as PaymentStatus,
          };
        }),
      });
    },
    [state.invoices, set],
  );

  const markInvoicePaid: AppStore["markInvoicePaid"] = useCallback(
    (invoiceId) => {
      set({
        invoices: state.invoices.map((invoice) =>
          invoice.id === invoiceId
            ? { ...invoice, paidAmount: invoice.totalAmount, status: "paid" }
            : invoice,
        ),
      });
    },
    [state.invoices, set],
  );

  const updateSettings: AppStore["updateSettings"] = useCallback(
    (input) => set({ settings: { ...state.settings, ...input } }),
    [state.settings, set],
  );

  const resetData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: "reset" });
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      state,
      ready,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      createRental,
      issueDraft,
      updateRental,
      cancelRental,
      recordReturn,
      recordPayment,
      markInvoicePaid,
      updateSettings,
      resetData,
      customerById: (id) => state.customers.find((customer) => customer.id === id),
      materialById: (id) => state.materials.find((material) => material.id === id),
      rentalById: (id) => state.rentals.find((rental) => rental.id === id),
      invoiceForRental: (rentalId) =>
        state.invoices.find((invoice) => invoice.rentalId === rentalId),
      returnsForRental: (rentalId) =>
        state.returns
          .filter((record) => record.rentalId === rentalId)
          .sort((a, b) => a.returnDate.localeCompare(b.returnDate)),
      rentalsForCustomer: (customerId) =>
        state.rentals.filter((rental) => rental.customerId === customerId),
      invoicesForCustomer: (customerId) =>
        state.invoices.filter((invoice) => invoice.customerId === customerId),
      rentalsForMaterial: (materialId) =>
        state.rentals.filter((rental) =>
          rental.items.some((item) => item.materialId === materialId),
        ),
      rateChangesForMaterial: (materialId) =>
        state.rateChanges
          .filter((change) => change.materialId === materialId)
          .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
    }),
    [
      state,
      ready,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      createRental,
      issueDraft,
      updateRental,
      cancelRental,
      recordReturn,
      recordPayment,
      markInvoicePaid,
      updateSettings,
      resetData,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error("useAppStore must be used inside <AppStoreProvider>.");
  return context;
}

/** Day-count options taken from Settings — pass these into calculation helpers. */
export function useDayOptions() {
  const { state } = useAppStore();
  return useMemo(
    () => ({
      convention: state.settings.dayCountConvention,
      minimumBillableDays: state.settings.minimumBillableDays,
    }),
    [state.settings.dayCountConvention, state.settings.minimumBillableDays],
  );
}

export const todayIso = () => format(new Date(), "yyyy-MM-dd");

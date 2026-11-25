import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Bills from "./Bills";

const { mockUseAuth, mockFrom } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockFrom: vi.fn() }));
vi.mock("../lib/auth", () => ({ useAuth: mockUseAuth }));
vi.mock("../lib/supabase", () => ({ supabase: { from: mockFrom } }));

const row = { id: "bill-1", business_id: "business-1", name: "Rent", amount: 3500, due_date: "2026-11-28", frequency: "Monthly", category: "Rent", status: "Unpaid", paid_at: null, created_at: "2026-11-01T00:00:00Z" };

function mockBills() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: { id: row.id }, error: null })),
    order: vi.fn(async () => ({ data: [row], error: null })),
  };
  mockFrom.mockReturnValue(builder);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("S9 Bills role access", () => {
  it("T-US11-4: Staff can read bills and sees no management controls", async () => {
    mockUseAuth.mockReturnValue({ membership: { role: "Staff", businessId: "business-1" } });
    mockBills();
    render(<MemoryRouter><Bills /></MemoryRouter>);

    expect(await screen.findByText("Rent")).toBeTruthy();
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("bills"));
    for (const label of ["Add bill", "Edit", "Delete", "Mark paid"]) expect(screen.queryByRole("button", { name: label })).toBeNull();
  });

  it("shows management controls to the Owner", async () => {
    mockUseAuth.mockReturnValue({ membership: { role: "Owner", businessId: "business-1" } });
    mockBills();
    render(<MemoryRouter><Bills /></MemoryRouter>);

    expect(await screen.findByRole("button", { name: "Mark paid" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Add bill" })).toHaveLength(1);
  });

  it("T-US11-2: marks an unpaid bill paid and shows its success toast", async () => {
    mockUseAuth.mockReturnValue({ membership: { role: "Owner", businessId: "business-1" } });
    mockBills();
    render(<MemoryRouter><Bills /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Mark paid" }));
    expect((await screen.findByRole("status")).textContent).toContain("Rent marked as paid.");
    expect(mockFrom).toHaveBeenCalledWith("bills");
  });
});

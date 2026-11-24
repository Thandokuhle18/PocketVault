import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BusinessSetup from "./BusinessSetup";

const { rpc, loadMembership } = vi.hoisted(() => ({ rpc: vi.fn(), loadMembership: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { rpc } }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ membership: null, membershipLoading: false, loadMembership }) }));

afterEach(cleanup);
beforeEach(() => { rpc.mockReset(); loadMembership.mockReset(); rpc.mockResolvedValue({ error: null }); loadMembership.mockResolvedValue({ role: "Owner", businessId: "business-id" }); });

function DashboardResult() {
  const location = useLocation();
  return <p>{(location.state as { toast?: string } | null)?.toast ?? "Dashboard"}</p>;
}

function renderSetup() {
  return render(<MemoryRouter initialEntries={["/setup"]}><Routes>
    <Route path="/setup" element={<BusinessSetup />} />
    <Route path="/dashboard" element={<DashboardResult />} />
  </Routes></MemoryRouter>);
}

describe("S5 Business Setup / US3", () => {
  it("T-US3-1 creates the business, refreshes membership and routes to the dashboard with the success toast", async () => {
    renderSetup();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Zodwa's Home Bakery" } });
    fireEvent.change(screen.getByLabelText("Business type"), { target: { value: "Bakery or catering" } });
    fireEvent.change(screen.getByLabelText("Business stage"), { target: { value: "Operating" } });
    fireEvent.change(screen.getByLabelText("Opening balance"), { target: { value: "R2,000.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Create business" }));
    expect(await screen.findByText("Business created. Start your plan.")).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith("create_business", expect.objectContaining({
      p_name: "Zodwa's Home Bakery", p_business_type: "Bakery or catering", p_stage: "Operating", p_opening_balance: 2000,
    }));
    expect(loadMembership).toHaveBeenCalledOnce();
  });

  it("T-US3-2 shows the name error for a name shorter than three characters", async () => {
    renderSetup();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Zo" } });
    fireEvent.click(screen.getByRole("button", { name: "Create business" }));
    expect(await screen.findByText("Enter a business name of 3 to 60 characters.")).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["-1", "10000000.01"])("T-US3-3 shows the balance error for %s", async value => {
    renderSetup();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Valid name" } });
    fireEvent.change(screen.getByLabelText("Opening balance"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Create business" }));
    expect(await screen.findByText("Enter an amount from R0.00 to R10,000,000.00.")).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("shows the shared server error and retry action when Supabase fails", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "database details are hidden" } });
    renderSetup();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Valid name" } });
    fireEvent.click(screen.getByRole("button", { name: "Create business" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Something went wrong. Try again."));
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByText("database details are hidden")).toBeNull();
  });
});

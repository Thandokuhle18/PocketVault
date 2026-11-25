import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";

const { mockFrom, mockUseAuth, mockData, mockInsertCalls } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockUseAuth: vi.fn(), mockData: { invites: [] as { id: string; email: string; status: string }[], memberships: [] as { user_id: string; role: string }[], profiles: [] as { id: string; email: string; full_name: string }[], profile: { id: "owner-id", email: "owner@example.com", full_name: "Zodwa Mthembu" }, insertError: "" }, mockInsertCalls: [] as unknown[] }));
vi.mock("../lib/supabase", () => ({ supabase: { from: mockFrom } }));
vi.mock("../lib/auth", () => ({ useAuth: mockUseAuth }));

function result(table: string, operation: string, value: unknown) {
  if (table === "profiles") return { data: operation === "single" ? mockData.profile : mockData.profiles, error: null };
  if (table === "businesses") return { data: { name: "Zodwa's Home Bakery", type: "Bakery or catering", stage: "Operating" }, error: null };
  if (table === "memberships") return { data: mockData.memberships, error: null };
  if (table === "invites" && operation === "maybeSingle") return { data: mockData.invites.find((item) => item.email === (value as { email?: string })?.email) ?? null, error: null };
  if (table === "invites" && operation === "insert") {
    const payload = value as { email: string };
    mockInsertCalls.push(payload);
    if (mockData.insertError) return { data: null, error: { message: mockData.insertError } };
    const row = { id: "invite-new", email: payload.email, status: "Pending" };
    mockData.invites.push(row);
    return { data: null, error: null };
  }
  if (table === "invites") return { data: mockData.invites, error: null };
  return { data: [], error: null };
}

function createBuilder(table: string) {
  let operation = "select"; let payload: unknown;
  const builder: Record<string, unknown> = {}; const filters: Record<string, unknown> = {};
  for (const method of ["select", "in", "order"]) builder[method] = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => { filters[column] = value; return builder; });
  builder.insert = vi.fn((input: unknown) => { operation = "insert"; payload = input; return builder; });
  builder.update = vi.fn((input: unknown) => { operation = "update"; payload = input; return builder; });
  builder.delete = vi.fn(() => { operation = "delete"; return builder; });
  builder.single = vi.fn(async () => result(table, "single", payload));
  builder.maybeSingle = vi.fn(async () => result(table, "maybeSingle", filters));
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result(table, operation, payload)).then(resolve, reject);
  return builder;
}

afterEach(() => { cleanup(); vi.clearAllMocks(); mockData.invites = []; mockData.memberships = []; mockData.profiles = []; mockData.profile = { id: "owner-id", email: "owner@example.com", full_name: "Zodwa Mthembu" }; mockData.insertError = ""; mockInsertCalls.length = 0; });
function renderSettings(role = "Owner") {
  if (role === "Staff") mockData.profile = { id: "staff-id", email: "lwazi@example.com", full_name: "Lwazi Ndlovu" };
  mockUseAuth.mockReturnValue({ membership: { role, businessId: "business-1" }, session: { user: { id: role === "Owner" ? "owner-id" : "staff-id" } }, signOut: vi.fn() });
  mockFrom.mockImplementation((table: string) => createBuilder(table));
  return render(<MemoryRouter><Settings /></MemoryRouter>);
}

describe("S10 Settings and M4 / US4", () => {
  it("T-US4-1 saves a normalized invite, lists Pending and shows the success toast", async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole("button", { name: "Invite staff" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: " Lwazi@Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect((await screen.findByRole("status")).textContent).toContain("Invite saved. Ask them to sign up with this email.");
    expect(await screen.findByText("lwazi@example.com")).toBeTruthy();
    expect(screen.getByText(/Pending/)).toBeTruthy();
    expect(mockInsertCalls).toEqual([{ business_id: "business-1", email: "lwazi@example.com", status: "Pending" }]);
  });

  it("T-US4-2 shows the BR23 server limit inside M4", async () => {
    mockData.insertError = "You have reached the limit of 5 staff.";
    renderSettings();
    fireEvent.click(await screen.findByRole("button", { name: "Invite staff" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect((await screen.findByRole("alert")).textContent).toContain("You have reached the limit of 5 staff.");
  });

  it("T-US4-3 displays an accepted invite through the Staff membership", async () => {
    mockData.memberships = [{ user_id: "staff-1", role: "Staff" }];
    mockData.profiles = [{ id: "staff-1", email: "lwazi@example.com", full_name: "Lwazi Ndlovu" }];
    mockData.invites = [{ id: "invite-accepted", email: "lwazi@example.com", status: "Accepted" }];
    renderSettings();
    expect(await screen.findByText("lwazi@example.com")).toBeTruthy();
    expect(screen.getByText(/Accepted/)).toBeTruthy();
  });

  it("T-US4-4 shows the field error and does not insert an invalid address", async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole("button", { name: "Invite staff" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "lwazi@" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Enter a valid email address.");
    expect(mockInsertCalls).toHaveLength(0);
  });

  it("Staff sees their own details and no team invite controls", async () => {
    renderSettings("Staff");
    expect(await screen.findByText("Lwazi Ndlovu")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Invite staff" })).toBeNull();
    expect(screen.queryByText("Zodwa's Home Bakery")).toBeTruthy();
  });
});

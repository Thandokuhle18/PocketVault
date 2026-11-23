import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Welcome from "./Welcome";

afterEach(cleanup);

describe("S1 Welcome", () => {
  it("shows the tagline and both buttons", () => {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
    expect(screen.getByText("Home for your finances.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create account" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
  });
});

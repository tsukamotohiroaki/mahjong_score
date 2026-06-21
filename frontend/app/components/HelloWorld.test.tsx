import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HelloWorld from "./HelloWorld";

describe("HelloWorld", () => {
  it("「Hello World」を表示する", () => {
    render(<HelloWorld displayName="太郎" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("渡された LINE 表示名を表示する", () => {
    render(<HelloWorld displayName="太郎" />);
    expect(screen.getByText(/太郎/)).toBeInTheDocument();
  });
});

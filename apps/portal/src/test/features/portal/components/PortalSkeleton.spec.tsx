import { describe, expect, it } from "vitest";
import PortalSkeleton from "../../../../features/portal/components/PortalSkeleton";
import { renderWithProviders } from "../../../renderWithProviders";

describe("PortalSkeleton", () => {
  it("指定件数のスケルトンカードとヘッダーを描画する", () => {
    const { container } = renderWithProviders(
      <PortalSkeleton itemCount={3} showHeader />
    );

    expect(container.querySelectorAll(".MuiCard-root")).toHaveLength(3);
    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(0);
  });
});

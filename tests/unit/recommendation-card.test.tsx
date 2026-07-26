import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecommendationCard } from "@/components/decisions/RecommendationCard";
import { recommendFor } from "@/lib/ai/recommend";

describe("RecommendationCard display", () => {
  const { options } = recommendFor("outdoor dining set", 2000, "GBP");
  const best = options.find((o) => o.is_best_match)!;

  it("renders the best match label, total price, inclusions and reasons", () => {
    render(
      <RecommendationCard option={best} onSave={() => {}} onReject={() => {}} onApprove={() => {}} />,
    );
    expect(screen.getByText(/best match/i)).toBeInTheDocument();
    expect(screen.getByText(best.title)).toBeInTheDocument();
    expect(screen.getByText(/what.s included/i)).toBeInTheDocument();
    expect(screen.getByText(/why nook picks this/i)).toBeInTheDocument();
    // Each included line item is shown.
    expect(screen.getByText(best.items[0].name)).toBeInTheDocument();
  });

  it("fires the approve handler", () => {
    const onApprove = vi.fn();
    render(
      <RecommendationCard option={best} onSave={() => {}} onReject={() => {}} onApprove={onApprove} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve purchase/i }));
    expect(onApprove).toHaveBeenCalledOnce();
  });
});

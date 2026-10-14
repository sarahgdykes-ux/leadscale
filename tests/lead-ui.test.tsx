import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PriorityBadge, ScoreMark } from "../src/components/lead/LeadSignals";

describe("lead signal accessibility", () => {
  it("renders priority as readable text and announces scores out of 100", () => {
    const markup = renderToStaticMarkup(createElement("div", null,
      createElement(PriorityBadge, { priority: "URGENT" }),
      createElement(ScoreMark, { score: 92 }),
    ));
    expect(markup).toContain("Urgent");
    expect(markup).toContain("Score 92 out of 100");
    expect(markup).not.toContain('aria-label="Lead score 92 out of 100"');
  });
});
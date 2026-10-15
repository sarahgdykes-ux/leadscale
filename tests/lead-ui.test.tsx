import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PriorityBadge, ScoreMark } from "../src/components/lead/LeadSignals";
import { LeadContactActions } from "../src/components/lead/LeadContactActions";

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

  it("offers accessible email and call actions for available contact methods", () => {
    const markup = renderToStaticMarkup(
      createElement(LeadContactActions, {
        name: "Jordan Lee",
        email: "jordan.lee@example.test",
        phone: "+1 (555) 010-1000",
      }),
    );
    expect(markup).toContain('href="mailto:jordan.lee%40example.test"');
    expect(markup).toContain('href="tel:%2B1%20(555)%20010-1000"');
    expect(markup).toContain('aria-label="Email Jordan Lee"');
    expect(markup).toContain('aria-label="Call Jordan Lee"');
  });

  it("renders only the contact action supported by the lead record", () => {
    const markup = renderToStaticMarkup(
      createElement(LeadContactActions, {
        name: "Taylor Reed",
        phone: "555-0102",
      }),
    );
    expect(markup).toContain("Call client");
    expect(markup).not.toContain("Email client");
    expect(markup).not.toContain("mailto:");
  });

  it("omits contact actions when no contact methods exist", () => {
    const markup = renderToStaticMarkup(
      createElement(LeadContactActions, { name: "Alex Morgan" }),
    );
    expect(markup).toBe("");
  });
});
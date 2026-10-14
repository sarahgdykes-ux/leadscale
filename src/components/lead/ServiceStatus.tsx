"use client";

import { useEffect, useState } from "react";
import { fetchServiceStatus } from "../../../lib/client/leadClient";

export function ServiceStatus() {
  const fixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURES !== "false";
  const [label, setLabel] = useState(fixtureMode ? "Demo data" : "Checking service");

  useEffect(() => {
    if (fixtureMode) return;
    let active = true;
    void fetchServiceStatus()
      .then((status) => {
        if (active) setLabel(status.mode === "live" ? "Live service" : "Mock service");
      })
      .catch(() => {
        if (active) setLabel("API unavailable");
      });
    return () => {
      active = false;
    };
  }, [fixtureMode]);

  return (
    <span className={`mode-indicator ${fixtureMode ? "mode-indicator--fixtures" : "mode-indicator--api"}`} role="status">
      <span className="mode-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
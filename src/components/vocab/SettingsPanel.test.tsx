import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "@/lib/vocab/settings";
import type { SrsSettings } from "@/lib/vocab/types";
import { SettingsPanel } from "./SettingsPanel";

afterEach(cleanup);

function setup(settings: SrsSettings = DEFAULT_SRS_SETTINGS) {
  const onSave = vi.fn<(s: SrsSettings) => Promise<void>>(async () => {});
  const onRescheduleAll = vi.fn<(s: SrsSettings) => Promise<number>>(async () => 3);
  render(<SettingsPanel settings={settings} onSave={onSave} onRescheduleAll={onRescheduleAll} />);
  const stepsField = () => screen.getByPlaceholderText("1m 10m") as HTMLInputElement;
  return { onSave, onRescheduleAll, stepsField };
}

describe("SettingsPanel", () => {
  it("lets you type several learning steps, spaces and all", async () => {
    const { onSave, stepsField } = setup();
    // Typed one character at a time, a space used to be swallowed as soon as it was typed.
    for (const value of ["1m", "1m ", "1m 1", "1m 10", "1m 10m", "1m 10m ", "1m 10m 1h"]) {
      fireEvent.change(stepsField(), { target: { value } });
      expect(stepsField().value).toBe(value);
    }
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save Settings" })));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ learningSteps: ["1m", "10m", "1h"] }));
    expect(screen.getByText("Settings saved.")).toBeTruthy();
  });

  it("saves changed settings before rescheduling, so the new retention is the one used", async () => {
    const { onSave, onRescheduleAll } = setup();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.85" } });
    fireEvent.click(screen.getByRole("button", { name: "Reschedule Cards" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Reschedule" })));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ desiredRetention: 0.85 }));
    expect(onRescheduleAll).toHaveBeenCalledWith(expect.objectContaining({ desiredRetention: 0.85 }));
    expect(screen.getByText("Rescheduled 3 cards.")).toBeTruthy();
  });

  it("doesn't save or reschedule when a setting is invalid", async () => {
    const { onSave, onRescheduleAll, stepsField } = setup();
    fireEvent.change(stepsField(), { target: { value: "1 minute" } });
    fireEvent.click(screen.getByRole("button", { name: "Reschedule Cards" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Reschedule" })));
    expect(onSave).not.toHaveBeenCalled();
    expect(onRescheduleAll).not.toHaveBeenCalled();
    expect(screen.getByText("Use values like 1m, 10m, 1h, or 1d.")).toBeTruthy();
  });
});

//@ts-nocheck
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useMemo, useState } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = useMemo(() => {
    return customerName.trim().length > 0 && !submitting;
  }, [customerName, submitting]);

  async function handleSubmit() {
    setErrorMsg("");
    setSuccessMsg("");

    if (!customerName.trim()) {
      setErrorMsg("Customer name is required.");
      return;
    }

    setSubmitting(true);

    try {
      const token = await shopify.session.getSessionToken();

      if (!token) {
        setErrorMsg("You don’t have permission to use this app.");
        return;
      }

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() ? customerPhone.trim() : null,
        partySize: Number.isFinite(Number(partySize)) ? Number(partySize) : 1,
        notes: notes.trim() ? notes.trim() : null,
      };

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          `Request failed (status ${res.status}).`;
        setErrorMsg(msg);
        return;
      }

      setSuccessMsg("Added to waitlist.");

      // Clear form for quick repeat entries
      setCustomerName("");
      setCustomerPhone("");
      setPartySize("1");
      setNotes("");
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <s-page heading="Add to waitlist">
      <s-scroll-box>
        <s-box padding="small" gap="small">
          {errorMsg ? <s-banner tone="critical">{errorMsg}</s-banner> : null}
          {successMsg ? <s-banner tone="success">{successMsg}</s-banner> : null}

          <s-form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) handleSubmit();
            }}
          >
            <s-box gap="small">
              <s-text-field
                label="Customer name"
                value={customerName}
                onChange={setCustomerName}
                placeholder="Jane Doe"
                required
              />

              <s-text-field
                label="Phone (optional)"
                value={customerPhone}
                onChange={setCustomerPhone}
                placeholder="555-555-5555"
              />

              <s-text-field
                label="Party size"
                value={partySize}
                onChange={setPartySize}
                inputMode="numeric"
                placeholder="1"
              />

              <s-text-area
                label="Notes (optional)"
                value={notes}
                onChange={setNotes}
                placeholder="Allergy, preferred staff member, etc."
              />

              <s-button
                kind="primary"
                disabled={!canSubmit}
                loading={submitting}
                onPress={handleSubmit}
              >
                Add customer
              </s-button>
            </s-box>
          </s-form>
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}
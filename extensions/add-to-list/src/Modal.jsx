//@ts-nocheck
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useMemo, useState } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Backend expects:
  // { locationId, customerName, customerEmail, notes }
  const customerName = useMemo(() => {
    return `${customerFirstName}`.trim() && `${customerLastName}`.trim()
      ? `${customerFirstName.trim()} ${customerLastName.trim()}`
      : "";
  }, [customerFirstName, customerLastName]);

  const canSubmit = useMemo(() => {
    return customerName.length > 0 && !submitting;
  }, [customerName, submitting]);

  async function handleSubmit() {
    setErrorMsg("");
    setSuccessMsg("");

    if (!customerFirstName.trim() || !customerLastName.trim()) {
      setErrorMsg("Customer first name and last name are required.");
      return;
    }

    setSubmitting(true);

    try {
      const token = await shopify.session.getSessionToken();

      if (!token) {
        setErrorMsg("You don’t have permission to use this app.");
        return;
      }

      const session = await shopify.session.getCurrentSession();
      const locationId = session?.locationId;

      if (!locationId) {
        setErrorMsg("Could not determine the current location in POS.");
        return;
      }

      const payload = {
        locationId,
        customerName,
        customerEmail: customerEmail.trim() ? customerEmail.trim() : null,
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
          data?.error || data?.message || `Request failed (status ${res.status}).`;
        setErrorMsg(msg);
        return;
      }

      setSuccessMsg("Added to waitlist.");

      // Clear form for quick repeat entries
      setCustomerFirstName("");
      setCustomerLastName("");
      setCustomerEmail("");
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
                label="Customer first name"
                value={customerFirstName}
                onChange={setCustomerFirstName}
                placeholder="Jane"
                required
              />

              <s-text-field
                label="Customer last name"
                value={customerLastName}
                onChange={setCustomerLastName}
                placeholder="Doe"
                required
              />

              <s-text-field
                label="Email (optional)"
                value={customerEmail}
                onChange={setCustomerEmail}
                placeholder="jane@example.com"
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
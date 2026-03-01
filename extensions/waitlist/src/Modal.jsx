//@ts-nocheck
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import QueueListScreen from "./screens/QueueListScreen.jsx";
import AddCustomerScreen from "./screens/AddCustomerScreen.jsx";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const url = navigation.currentEntry.url ?? "QueueList";

  if (url.includes("AddCustomer")) {
    return <AddCustomerScreen />;
  }

  return <QueueListScreen />;
}
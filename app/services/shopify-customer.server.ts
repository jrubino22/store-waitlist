import shopify from "../shopify.server";

export async function findOrCreateShopifyCustomer({
  shop,
  firstName,
  lastName,
  email,
}: {
  shop: string;
  firstName: string;
  lastName: string;
  email: string | null;
}) {
  console.log(JSON.stringify({ msg: "shopify.customer.start", shop, firstName, lastName, email }));

  if (!email) {
    console.log(JSON.stringify({ msg: "shopify.customer.skipped", reason: "no email" }));
    return null;
  }

  const { admin } = await shopify.unauthenticated.admin(shop);

  // --- SEARCH ---
  let searchData: any;
  try {
    const searchResponse = await admin.graphql(`
      query findCustomer($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              email
              emailMarketingConsent { marketingState }
            }
          }
        }
      }
    `, { variables: { query: `email:${email}` } });

    searchData = await searchResponse.json();
    console.log(JSON.stringify({ msg: "shopify.customer.search.response", searchData }));
  } catch (err) {
    console.error(JSON.stringify({ msg: "shopify.customer.search.error", error: String(err) }));
    return null;
  }

  const existing = searchData?.data?.customers?.edges?.[0]?.node;

  if (existing) {
    console.log(JSON.stringify({ msg: "shopify.customer.found", id: existing.id }));
    return existing.id;
  }

  console.log(JSON.stringify({ msg: "shopify.customer.not.found", email }));

  // --- CREATE ---
  let createData: any;
  try {
    const createResponse = await admin.graphql(`
      mutation createCustomer($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        input: {
          firstName,
          lastName,
          email,
          emailMarketingConsent: {
            marketingState: "SUBSCRIBED",
            marketingOptInLevel: "SINGLE_OPT_IN",
          },
        },
      },
    });

    createData = await createResponse.json();
    console.log(JSON.stringify({ msg: "shopify.customer.create.response", createData }));
  } catch (err) {
    console.error(JSON.stringify({ msg: "shopify.customer.create.error", error: String(err) }));
    return null;
  }

  const userErrors = createData?.data?.customerCreate?.userErrors;
  if (userErrors?.length > 0) {
    console.error(JSON.stringify({ msg: "shopify.customer.create.userErrors", userErrors }));
    return null;
  }

  const newId = createData?.data?.customerCreate?.customer?.id;
  console.log(JSON.stringify({ msg: "shopify.customer.created", id: newId }));
  return newId;
}
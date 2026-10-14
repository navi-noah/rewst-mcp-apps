// A fake MSP's clients. The orgs are Microsoft's own sample companies, so the
// messy vendor-side names below are messy on purpose and nobody real is involved.

export type Org = { id: string; name: string; domain?: string };

export const orgs: Org[] = [
  { id: "org-msp", name: "Relecloud (our MSP)", domain: "relecloud.com" },
  { id: "org-contoso", name: "Contoso", domain: "contoso.com" },
  { id: "org-contoso-pharma", name: "Contoso Pharmaceuticals", domain: "contosopharma.com" },
  { id: "org-fabrikam", name: "Fabrikam", domain: "fabrikam.com" },
  { id: "org-northwind", name: "Northwind Traders", domain: "northwindtraders.com" },
  { id: "org-tailspin", name: "Tailspin Toys", domain: "tailspintoys.com" },
  { id: "org-woodgrove", name: "Woodgrove Bank", domain: "woodgrovebank.com" },
  { id: "org-adatum", name: "A. Datum Corporation", domain: "adatum.com" },
  { id: "org-litware", name: "Litware", domain: "litwareinc.com" },
  { id: "org-adventureworks", name: "Adventure Works Cycles", domain: "adventure-works.com" },
  { id: "org-wwi", name: "Wide World Importers", domain: "wideworldimporters.com" },
  { id: "org-coho", name: "Coho Winery", domain: "cohowinery.com" },
  { id: "org-alpine", name: "Alpine Ski House", domain: "alpineskihouse.com" },
  { id: "org-proseware", name: "Proseware", domain: "proseware.com" },
  { id: "org-lucerne", name: "Lucerne Publishing", domain: "lucernepublishing.com" },
  { id: "org-fourthcoffee", name: "Fourth Coffee", domain: "fourthcoffee.com" },
  { id: "org-humongous", name: "Humongous Insurance", domain: "humongousinsurance.com" },
  { id: "org-trey", name: "Trey Research", domain: "treyresearch.net" },
];

export type VendorRecord = { id: string; name: string; hint: string };

export const integrations: Record<string, { label: string; idLabel: string; records: VendorRecord[] }> = {
  "connectwise-psa": {
    label: "ConnectWise PSA",
    idLabel: "Company ID",
    records: [
      { id: "RELECLOUD", name: "Relecloud", hint: "type: Owner, 14 contacts" },
      { id: "CONTOSO", name: "Contoso Ltd", hint: "contoso.com, head office" },
      { id: "CONTOSO-NB", name: "Contoso - North Branch", hint: "contoso.com, branch office" },
      { id: "CONTOSOPH", name: "CONTOSO PHARMA", hint: "contosopharma.com" },
      { id: "FABRIKAM", name: "Fabrikam, Inc.", hint: "fabrikam.com" },
      { id: "FABFIELD", name: "Fabrikam Field Services", hint: "fabrikamfield.com, 6 contacts" },
      { id: "NORTHWIND", name: "Northwind Traders", hint: "northwindtraders.com" },
      { id: "NWT-OLD", name: "Northwind (OLD - DO NOT USE)", hint: "inactive since 2024" },
      { id: "TAILSPIN", name: "Tailspin Toys LLC", hint: "tailspintoys.com" },
      { id: "WOODGROVE", name: "Woodgrove Bank & Trust", hint: "woodgrovebank.com" },
      { id: "ADATUM", name: "Adatum Corp", hint: "adatum.com" },
      { id: "LITWARE", name: "Litware Inc", hint: "litwareinc.com" },
      { id: "AWC", name: "AW Cycles", hint: "adventure-works.com" },
      { id: "WWIMPORTERS", name: "WWI - Wide World", hint: "wideworldimporters.com" },
      { id: "COHOVIN", name: "Coho Vineyard & Winery", hint: "cohovineyard.com" },
      { id: "ALPINESKI", name: "Alpine Ski House", hint: "alpineskihouse.com" },
      { id: "PROSEWARE", name: "Proseware, Inc.", hint: "proseware.com" },
      { id: "LUCERNE", name: "Lucerne Pub.", hint: "lucernepublishing.com" },
      { id: "4THCOFFEE", name: "Fourth Coffee Co", hint: "fourthcoffee.com" },
      { id: "HUMONGOUS", name: "Humongous Ins. Agency", hint: "humongousinsurance.com" },
      { id: "GDI", name: "Graphic Design Institute", hint: "graphicdesigninstitute.com, new client" },
      { id: "CATCHALL", name: "Catchall - Unknown Callers", hint: "used for unmatched calls" },
    ],
  },
  "microsoft-365": {
    label: "Microsoft 365 (GDAP)",
    idLabel: "Default domain",
    records: [
      { id: "relecloud.onmicrosoft.com", name: "Relecloud", hint: "partner tenant" },
      { id: "contoso.onmicrosoft.com", name: "Contoso", hint: "contoso.com verified" },
      { id: "contosopharma.onmicrosoft.com", name: "Contoso Pharmaceuticals Inc", hint: "contosopharma.com verified" },
      { id: "fabrikamhq.onmicrosoft.com", name: "Fabrikam HQ", hint: "fabrikam.com, fabrikamfield.com verified" },
      { id: "northwindtraders.onmicrosoft.com", name: "Northwind Traders", hint: "northwindtraders.com verified" },
      { id: "contosotrial.onmicrosoft.com", name: "Contoso", hint: "no custom domain, trial tenant" },
      { id: "tailspintoys.onmicrosoft.com", name: "Tailspin", hint: "tailspintoys.com verified" },
      { id: "woodgrove.onmicrosoft.com", name: "Woodgrove Bank", hint: "woodgrovebank.com verified" },
      { id: "adatumcorp.onmicrosoft.com", name: "A Datum", hint: "adatum.com verified" },
      { id: "cohowinery.onmicrosoft.com", name: "Coho Winery", hint: "cohowinery.com, cohovineyard.com verified" },
      { id: "lucernepub.onmicrosoft.com", name: "Lucerne Publishing", hint: "lucernepublishing.com verified" },
      { id: "fourthcoffee.onmicrosoft.com", name: "4th Coffee", hint: "fourthcoffee.com verified" },
      { id: "treyresearch.onmicrosoft.com", name: "Trey Research", hint: "treyresearch.net verified" },
      { id: "gdi.onmicrosoft.com", name: "Graphic Design Institute", hint: "graphicdesigninstitute.com verified" },
    ],
  },
};

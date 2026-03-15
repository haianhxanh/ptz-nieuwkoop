import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const { FAKTUROID_API, FAKTUROID_USER_AGENT } = process.env;
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.FAKTUROID_CLIENT_ID;
  const clientSecret = process.env.FAKTUROID_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("FAKTUROID_CLIENT_ID and FAKTUROID_CLIENT_SECRET must be set");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${FAKTUROID_API}/oauth/token`, {
    method: "POST",
    headers: {
      "User-Agent": FAKTUROID_USER_AGENT as string,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fakturoid OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; token_type: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.access_token;
}

async function fakturoidFetch(path: string, options: { method: string; body?: unknown }) {
  const token = await getAccessToken();

  const res = await fetch(`${FAKTUROID_API}${path}`, {
    method: options.method,
    headers: {
      "User-Agent": FAKTUROID_USER_AGENT as string,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    throw new Error(`Fakturoid API ${options.method} ${path} failed (${res.status}): ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }

  return { status: res.status, data: json, location: res.headers.get("location") };
}

interface SubjectData {
  name: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  registration_no?: string;
  vat_no?: string;
  email?: string;
  phone?: string;
}

async function findOrCreateSubject(slug: string, client: SubjectData): Promise<number> {
  if (client.email) {
    const byEmail = await fakturoidFetch(`/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(client.email)}`, { method: "GET" });
    const emailMatch = (byEmail.data as any[]).find((s: any) => s.email === client.email || s.email_copy === client.email);
    if (emailMatch) return emailMatch.id;
  }

  if (client.registration_no) {
    const byIco = await fakturoidFetch(`/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(client.registration_no)}`, { method: "GET" });
    const icoMatch = (byIco.data as any[]).find((s: any) => s.registration_no === client.registration_no);
    if (icoMatch) return icoMatch.id;
  }

  if (client.name) {
    const byName = await fakturoidFetch(`/accounts/${slug}/subjects/search.json?query=${encodeURIComponent(client.name)}`, { method: "GET" });
    const nameMatch = (byName.data as any[]).find((s: any) => s.name.toLowerCase() === client.name.toLowerCase());
    if (nameMatch) return nameMatch.id;
  }

  const subjectPayload: Record<string, unknown> = { name: client.name };
  if (client.street) subjectPayload.street = client.street;
  if (client.city) subjectPayload.city = client.city;
  if (client.zip) subjectPayload.zip = client.zip;
  if (client.country) subjectPayload.country = client.country;
  if (client.registration_no) subjectPayload.registration_no = client.registration_no;
  if (client.vat_no) subjectPayload.vat_no = client.vat_no;
  if (client.email) subjectPayload.email = client.email;
  if (client.phone) subjectPayload.phone = client.phone;

  const created = await fakturoidFetch(`/accounts/${slug}/subjects.json`, {
    method: "POST",
    body: subjectPayload,
  });

  return (created.data as any).id;
}

function buildInvoiceLines(items: any[]) {
  return items.map((item: any) => ({
    name: item.name,
    quantity: item.quantity ?? 1,
    unit_name: item.unit_name ?? "ks",
    unit_price: item.unit_price,
    vat_rate: item.vat_rate ?? 21,
  }));
}

function parseClientBody(body: any) {
  return {
    document_type: body.document_type,
    slug: body.slug as string | undefined,
    items: body.items as any[] | undefined,
    variable_symbol: body.variable_symbol,
    client_name: body.client_name,
    client_street: body.client_street,
    client_city: body.client_city,
    client_zip: body.client_zip,
    client_country: body.client_country,
    client_ico: body.client_ico,
    client_dic: body.client_dic,
    client_email: body.client_email,
    client_phone: body.client_phone,
    note: body.note,
    due: body.due,
  };
}

function invoiceResponse(invoice: any) {
  return {
    success: true,
    invoice_id: invoice.id,
    invoice_number: invoice.number,
    html_url: invoice.html_url,
    public_html_url: invoice.public_html_url,
    pdf_url: invoice.pdf_url,
    data: invoice,
  };
}

export const fakturoidCreateInvoice = async (req: Request, res: Response) => {
  try {
    const b = parseClientBody(req.body);

    if (!b.slug) return res.status(400).json({ success: false, error: "Missing 'slug'" });
    if (!b.items || !Array.isArray(b.items) || b.items.length === 0) return res.status(400).json({ success: false, error: "Missing or empty 'items'" });
    if (!b.client_name) return res.status(400).json({ success: false, error: "Missing 'client_name'" });

    const subjectId = await findOrCreateSubject(b.slug, {
      name: b.client_name,
      street: b.client_street,
      city: b.client_city,
      zip: b.client_zip,
      country: b.client_country,
      registration_no: b.client_ico,
      vat_no: b.client_dic,
      email: b.client_email,
      phone: b.client_phone,
    });

    const payload: Record<string, unknown> = {
      subject_id: subjectId,
      document_type: b.document_type || "proforma",
      due: b.due ?? 14,
      vat_price_mode: "from_total_with_vat",
      lines: buildInvoiceLines(b.items),
    };
    if (b.variable_symbol) payload.variable_symbol = b.variable_symbol;
    if (b.note) payload.note = b.note;

    const result = await fakturoidFetch(`/accounts/${b.slug}/invoices.json`, { method: "POST", body: payload });
    return res.status(201).json(invoiceResponse(result.data));
  } catch (error: any) {
    console.error("Fakturoid create proforma error:", error.message || error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create proforma" });
  }
};

export const fakturoidUpdateInvoice = async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) return res.status(400).json({ success: false, error: "Missing invoice id" });

    const b = parseClientBody(req.body);
    if (!b.slug) return res.status(400).json({ success: false, error: "Missing 'slug'" });

    const payload: Record<string, unknown> = {
      vat_price_mode: "from_total_with_vat",
    };

    if (b.items && Array.isArray(b.items) && b.items.length > 0) {
      const existing = await fakturoidFetch(`/accounts/${b.slug}/invoices/${invoiceId}.json`, { method: "GET" });
      const existingLines = ((existing.data as any).lines || []) as { id: number }[];
      const deletedLines = existingLines.map((line) => ({ id: line.id, _destroy: true }));
      payload.lines = [...deletedLines, ...buildInvoiceLines(b.items)];
    }

    if (b.due !== undefined) payload.due = b.due;
    if (b.variable_symbol) payload.variable_symbol = b.variable_symbol;
    if (b.note) payload.note = b.note;

    const result = await fakturoidFetch(`/accounts/${b.slug}/invoices/${invoiceId}.json`, { method: "PATCH", body: payload });
    return res.status(200).json(invoiceResponse(result.data));
  } catch (error: any) {
    console.error("Fakturoid update proforma error:", error.message || error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update proforma" });
  }
};

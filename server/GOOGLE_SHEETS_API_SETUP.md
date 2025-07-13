# Google Sheets API Setup Guide

Since you already have an API key from Google Console, here are your options for accessing Google Sheets:

## Option 1: API Key (Read-Only, Public Sheets)

### Setup

1. Add your API key to `.env`:

```env
GOOGLE_API_KEY=your_api_key_here
```

### Usage

```javascript
import { readGoogleSheetWithApiKey } from "./utilities/googleSheetsSimple";

// Read data from a public sheet
const data = await readGoogleSheetWithApiKey(spreadsheetId, "Sheet1!A:Z");
```

### Limitations

- **Read-only**: Can't write data to sheets
- **Public sheets only**: The sheet must be publicly accessible
- **No authentication**: Anyone with the link can access

## Option 2: Service Account (Recommended for Writing)

Since you need to **write data** to Google Sheets, you'll need a Service Account.

### Quick Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "Service Account"
4. Download the JSON key file
5. Add to your `.env`:

```env
# Method 1: File path
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/your/service-account-key.json

# Method 2: Direct credentials (recommended)
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account","project_id":"..."}
```

### Share Your Sheet

1. Open your Google Sheet
2. Click "Share"
3. Add the service account email (found in the JSON file as `client_email`)
4. Give it "Editor" permissions

## Current Implementation

Your controller now supports Google Sheets integration:

### API Endpoint

```
GET /api/export-daily-sales?storeHandle=dmp&date=2024-01-15&spreadsheetId=YOUR_SPREADSHEET_ID
```

### What it does

1. Exports detailed order data to Excel (existing functionality)
2. **Optionally** sends the same data to Google Sheets if `spreadsheetId` is provided
3. Formats data with headers: Date, Order Number, Product Title, SKU, Quantity, Unit Price, Total Price, Discount, Source

### Example Usage

```bash
# Without Google Sheets
curl "http://localhost:3000/api/export-daily-sales?storeHandle=dmp&date=2024-01-15"

# With Google Sheets
curl "http://localhost:3000/api/export-daily-sales?storeHandle=dmp&date=2024-01-15&spreadsheetId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
```

## Data Format in Google Sheets

Your detailed order data will be formatted as:

| Date       | Order Number | Product Title | SKU    | Quantity | Unit Price | Total Price | Discount | Source |
| ---------- | ------------ | ------------- | ------ | -------- | ---------- | ----------- | -------- | ------ |
| 2024-01-15 | #1001        | Product A     | SKU123 | 2        | 25.00      | 50.00       | 5.00     | web    |
| 2024-01-15 | #1001        | Doprava       |        | 1        | 10.00      | 10.00       |          | web    |

## Troubleshooting

### "The caller does not have permission"

- Make sure you've shared the Google Sheet with your service account email
- Check that the service account has "Editor" permissions

### "API key not valid"

- Ensure your API key is correct in the `.env` file
- Make sure the Google Sheets API is enabled in your Google Cloud project

### "Service account credentials not found"

- Check that `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` or `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` is set
- Ensure the JSON is properly formatted

## Which Method Should You Use?

- **For reading data**: API key is fine if the sheet is public
- **For writing data**: Service account is required
- **For your use case**: Since you're exporting sales data, you need the **Service Account method**

The service account method is already implemented and ready to use once you complete the setup!

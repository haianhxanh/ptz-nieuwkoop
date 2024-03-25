import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  CalloutCard,
  Divider,
  Checkbox,
  TextField,
} from "@shopify/polaris";
import { getAppMetaobject, updateAppMetaobject } from "./utils/reusables";

export default function SettingsPage() {
  const [autoImport, setAutoImport] = useState(false);
  const [autoImportInterval, setAutoImportInterval] = useState();

  const [syncInterval, setSyncInterval] = useState();

  const handleAutoImport = useCallback(async (value) => {
    setAutoImport(value);
    // create shop metafields
    if (value) {
      console.log("create metafield");
      let appMetaobject = await getAppMetaobject();
      let updateMetaobject = await updateAppMetaobject({
        id: appMetaobject?.data.id,
        fields: appMetaobject?.data.fields,
      });
      console.log(updateMetaobject);
    } else {
      // shopify.metafield.delete({
      //   id: shopify.metafields.find(
      //     (metafield) => metafield.key == "auto_import",
      //   ).id,
      // });
    }
  }, []);

  return (
    <Page fullWidth>
      <CalloutCard
        title="Set up product import from filter"
        primaryAction={{
          content: autoImport
            ? "Start auto-import with intervals"
            : "Start one-time import",
          url: "#",
        }}
      >
        <Divider />
        <Checkbox
          label="Auto-import in intervals"
          checked={autoImport}
          onChange={handleAutoImport}
        />
        {autoImport && (
          <>
            <Text variant="headingSm" as="h6">
              Set up interval
            </Text>
            <TextField
              label="Run every (hours)"
              type="number"
              value={autoImportInterval}
              onChange={(value) => setAutoImportInterval(value)}
              autoComplete="off"
            />
          </>
        )}
      </CalloutCard>
      <CalloutCard
        title="Sync products with Nieuwkoop"
        primaryAction={{
          content: "Save",
          url: "#",
        }}
      >
        <TextField
          label="Sync every (hours)"
          type="number"
          value={autoImportInterval}
          onChange={(value) => setSyncInterval(value)}
          autoComplete="off"
        />
      </CalloutCard>
    </Page>
  );
}

function Code({ children }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="100"
      paddingInlineEnd="100"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <code>{children}</code>
    </Box>
  );
}

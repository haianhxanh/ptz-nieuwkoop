import React, { useCallback, useEffect, useRef, useState } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Text,
  Card,
  Grid,
  IndexTable,
  useBreakpoints,
  useIndexResourceState,
  Thumbnail,
  Pagination,
  OptionList,
  Scrollable,
  Divider,
  CalloutCard,
  Checkbox,
  TextField,
  Button,
  Popover,
  ActionList,
  Box,
  Banner,
  MediaCard,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getExchangeRate,
  getProducts,
  importProducts,
  removeSizeInTitles,
} from "./utils/reusables";
import { IMPORT_STATUS } from "./utils/constants";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
          metaobjectByHandle(handle: {handle: "nieuwkoop-data", type: "nieuwkoop"}) {
            id
            fields {
              key
              value
            }
          }
        }`,
  );
  const data = await response.json();
  return json(data);
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
        metaobjectByHandle(handle: {handle: "nieuwkoop-data", type: "nieuwkoop"}) {
          id
          fields {
            key
            value
          }
        }
      }
    `,
  );
  const responseJson = await response.json();

  return json({
    product: responseJson.data?.productCreate?.product,
  });
};

export default function Index() {
  const data = useLoaderData();
  const appUrl = data?.data.metaobjectByHandle.fields.find(
    (field) => field.key == "app_url",
  )?.value;
  const itemsPerPage = 25;

  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);

  const [popoverActive, setPopoverActive] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [init, setInit] = useState(true);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const activator = (
    <Button onClick={togglePopoverActive} disclosure fullWidth size="large">
      More actions
    </Button>
  );

  const removeAllFilters = useCallback(() => {
    setFilteredBrands([]);
    setFilteredCollections([]);
    togglePopoverActive();
  }, [togglePopoverActive]);

  const handleImportAction = useCallback(async () => {
    togglePopoverActive();
    setImportStatus(IMPORT_STATUS.IN_PROGRESS);

    let productsToImport = [];
    for (const [index, variant] of items.entries()) {
      let singleProduct = {};
      let variants = items.filter(
        (item) =>
          item.matchingElement == variant.matchingElement &&
          removeSizeInTitles(item.title) == removeSizeInTitles(variant.title),
      );
      if (variants.length == 0) {
        singleProduct = [variant.sku];
      } else {
        singleProduct = variants.map((variant) => variant.sku);
      }

      const isProductIncluded = productsToImport.some(
        (product) =>
          product.length === singleProduct.length &&
          product.every((value, index) => value === singleProduct[index]),
      );

      if (!isProductIncluded) {
        productsToImport.push(singleProduct);
      }
    }

    const importProductsRes = await importProducts(productsToImport, appUrl);
    if (importProductsRes?.status) {
      if (importProductsRes?.status == 200) {
        setImportStatus(IMPORT_STATUS.COMPLETED);
        setTimeout(() => {
          setImportStatus("");
        }, 5000);
      } else {
        setImportStatus(IMPORT_STATUS.FAILED);
      }
    }
  }, [togglePopoverActive, items]);

  const nextPage = () => {
    if (currentPage <= Math.ceil(items.length / itemsPerPage)) {
      setCurrentPage((currentPage) => currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage >= 1) {
      setCurrentPage((currentPage) => currentPage - 1);
    }
  };

  useEffect(() => {
    setDisplayedProducts(
      items.slice(
        (currentPage - 1) * itemsPerPage,
        itemsPerPage + (currentPage - 1) * itemsPerPage,
      ),
    );
  }, [currentPage, items]);

  useEffect(() => {
    if (filteredProducts.length > 0) {
      setItems(filteredProducts);
    } else {
      setItems(products);
    }
  }, [filteredProducts, products]);

  useEffect(() => {
    // declare the data fetching function
    // async function getRate() {
    //   const rate = await getExchangeRate("EUR");
    //   console.log(rate);
    // }
    // getRate();

    const fetchData = async () => {
      const data = await getProducts(appUrl);
      const flatData = data?.data.products
        .map((product) => {
          return {
            title: product.Description,
            sku: product.Itemcode,
            brand:
              product.Tags.find((tag) => tag.Code == "Brand")?.Values[0]
                .Description_EN || "",
            price: (product.Salesprice * 26).toFixed(2),
            collection:
              product.Tags.find((tag) => tag.Code == "Collection")?.Values[0]
                .Description_EN || "",
            color:
              product.Tags.find((tag) => tag.Code == "ColourPlanter")?.Values[0]
                .Description_EN || "",
            material:
              product.Tags.find((tag) => tag.Code == "Material")?.Values[0]
                .Description_EN || "",
            weight: product.Weight || null,
            length: product.Length || null,
            width: product.Width || null,
            height: product.Height || null,
            depth: product.Depth || null,
            diameter: product.Diameter || null,
            image:
              "https://images.nieuwkoop-europe.com/images/" +
              product.ItemPictureName,
            matchingElement: removeSizeInTitles(product.ItemVariety_EN) || null,
          };
        })
        .sort((a, b) => a.matchingElement.localeCompare(b.matchingElement));

      // get all unique brands and collections
      const brands = [...new Set(flatData.map((product) => product.brand))]
        .filter((brand) => brand != "")
        .map((brand) => ({ label: brand, value: brand }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const collections = [
        ...new Set(flatData.map((product) => product.collection)),
      ]
        .filter((collection) => collection != "")
        .map((collection) => ({ label: collection, value: collection }))
        .sort((a, b) => a.label.localeCompare(b.label));

      setBrands(brands);
      setCollections(collections);
      setProducts(flatData);
      setDisplayedProducts(flatData.slice(0, itemsPerPage));
      setInit(false);
    };

    fetchData();
  }, []);

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(items);

  const rowMarkup = displayedProducts.map(
    (
      { title, sku, price, image, brand, collection, matchingElement },
      index,
    ) => (
      <IndexTable.Row
        id={sku}
        key={sku}
        selected={selectedResources.includes(sku)}
        position={index}
      >
        <IndexTable.Cell>
          <Thumbnail source={image} alt={title} />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {title}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{sku}</IndexTable.Cell>
        <IndexTable.Cell>{brand}</IndexTable.Cell>
        <IndexTable.Cell>{collection}</IndexTable.Cell>
        <IndexTable.Cell>{matchingElement}</IndexTable.Cell>
        <IndexTable.Cell>{price}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const handleSelectBrands = useCallback((value) => {
    setFilteredBrands(value);
    setFilteredCollections([]);
  }, []);

  const handleSelectCollections = useCallback((value) => {
    setFilteredCollections(value);
    setFilteredBrands([]);
  }, []);

  useEffect(() => {
    if (filteredBrands.length > 0) {
      const filteredItems = products.filter((product) =>
        filteredBrands.includes(product.brand),
      );
      setCurrentPage(1);
      setFilteredProducts(filteredItems);
    } else if (filteredCollections.length > 0) {
      const filteredItems = products.filter((product) =>
        filteredCollections.includes(product.collection),
      );
      setCurrentPage(1);
      setFilteredProducts(filteredItems);
    } else {
      setCurrentPage(1);
      setFilteredProducts([]);
    }
  }, [filteredBrands, filteredCollections, products]);

  return (
    <Page>
      <>
        {init && (
          <Banner>
            <p>Products are loading</p>
          </Banner>
        )}
        <Page fullWidth>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <Card title="Sales" sectioned>
                <Scrollable style={{ height: "200px" }}>
                  <OptionList
                    title="Brands"
                    onChange={handleSelectBrands}
                    options={brands}
                    selected={filteredBrands}
                    allowMultiple
                  />
                </Scrollable>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <Card title="Orders" sectioned>
                <Scrollable style={{ height: "200px" }}>
                  <OptionList
                    title="Collections"
                    onChange={handleSelectCollections}
                    options={collections}
                    selected={filteredCollections}
                    allowMultiple
                  />
                </Scrollable>
              </Card>
            </Grid.Cell>
          </Grid>
        </Page>

        <Page fullWidth>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              <Popover
                active={popoverActive}
                activator={activator}
                autofocusTarget="first-node"
                onClose={togglePopoverActive}
                fullWidth={true}
                fullHeight
              >
                <ActionList
                  actionRole="menuitem"
                  items={[
                    {
                      content: `Import filtered products - in total ${items.length} items`,
                      onAction: handleImportAction,
                    },
                    {
                      content: "Remove all filters",
                      onAction: removeAllFilters,
                    },
                  ]}
                />
              </Popover>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}>
              {importStatus != "" && (
                <Banner
                  title={importStatus}
                  tone={
                    importStatus == IMPORT_STATUS.COMPLETED
                      ? "success"
                      : importStatus == IMPORT_STATUS.IN_PROGRESS
                        ? "info"
                        : "warning"
                  }
                ></Banner>
              )}
            </Grid.Cell>
          </Grid>
        </Page>

        <Page fullWidth>
          <Card>
            <IndexTable
              condensed={useBreakpoints().smDown}
              resourceName={resourceName}
              itemCount={items.length}
              selectable={false}
              headings={[
                { title: "Image" },
                { title: "Product" },
                { title: "Sku" },
                { title: "Brand" },
                { title: "Collection" },
                { title: "Variety" },
                { title: "Price Kč" },
              ]}
            >
              {rowMarkup}
            </IndexTable>

            <Pagination
              hasPrevious={currentPage > 1}
              onPrevious={() => {
                prevPage();
              }}
              onNext={() => {
                nextPage();
              }}
              type="table"
              hasNext={currentPage < items.length / itemsPerPage}
              label={
                "page " +
                currentPage +
                " / " +
                Math.ceil(items.length / itemsPerPage)
              }
            />
          </Card>
        </Page>
      </>
      {/* )} */}
    </Page>
  );
}

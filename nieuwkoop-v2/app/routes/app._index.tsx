import { useCallback, useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
  Button,
  Popover,
  ActionList,
  Banner,
  IndexFilters,
  useSetIndexFiltersMode,
  Link,
} from "@shopify/polaris";
import type { IndexFiltersProps } from "@shopify/polaris";
// import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { API_ROUTES, IMPORT_STATUS, PRODUCT_TYPES } from "./utils/constants";
import {
  getAllVariants,
  getItemStatus,
  getProducts,
  importProducts,
  removeSizeInTitles,
} from "./utils/reusables";

type Variant = {
  productId: string;
  sku: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const env = process.env;
  return {
    env,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const { env } = useLoaderData<typeof loader>();
  let appUrl: string = "";
  if (env?.NODE_ENV) {
    appUrl =
      env?.NODE_ENV == "development"
        ? "http://localhost:9000"
        : "https://nieuwkoop.onrender.com";
  }
  const itemsPerPage = 25;
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [productType, setProductType] = useState("");
  const [brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [collections, setCollections] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);

  const [popoverActive, setPopoverActive] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [init, setInit] = useState(true);
  const [announcement, setAnnouncement] = useState("");

  const [sortSelected, setSortSelected] = useState(["product asc"]);
  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => {
    setQueryValue("");
  };
  const [selected, setSelected] = useState(0);
  const [productStatus, setProductStatus] = useState<string[] | undefined>(
    undefined,
  );

  const [queryValue, setQueryValue] = useState("");

  const handleFiltersQueryChange = useCallback(
    (value: string) => setQueryValue(value),
    [],
  );
  const handleAccountStatusRemove = useCallback(
    () => setProductStatus(undefined),
    [],
  );
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);

  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
  }, [handleQueryValueRemove]);

  const appliedFilters: IndexFiltersProps["appliedFilters"] = [];
  if (productStatus && !isEmpty(productStatus)) {
    const key = "productStatus";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, productStatus),
      onRemove: handleAccountStatusRemove,
    });
  }

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
    setProductType("");
    togglePopoverActive();
    setSelectedProducts([]);
  }, [togglePopoverActive]);

  const handleImportAction = useCallback(async () => {
    togglePopoverActive();
    let productsToImport: any = [];

    let inputItems;
    if (selectedProducts?.length > 0) {
      inputItems = selectedProducts;
    }

    if (!inputItems) {
      setAnnouncement("No products selected");
      return;
    }
    setImportStatus(IMPORT_STATUS.IN_PROGRESS);
    for (const variant of inputItems) {
      let singleProduct = {};
      let variants = products.filter(
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
        (product: any) =>
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
        let variantsRes = importProductsRes?.data?.variants;
        setVariants((prevVariants) => [...prevVariants, ...variantsRes]);

        setTimeout(() => {
          setImportStatus("");
        }, 5000);
      } else {
        setImportStatus(IMPORT_STATUS.FAILED);
      }
    }
  }, [togglePopoverActive, selectedProducts, appUrl, products]);

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
    if (items?.length > 0) {
      setDisplayedProducts(
        items.slice(
          (currentPage - 1) * itemsPerPage,
          itemsPerPage + (currentPage - 1) * itemsPerPage,
        ),
      );
    }
  }, [currentPage, items]);

  useEffect(() => {
    if (selectedProducts.length > 0) {
      setAnnouncement(`${selectedProducts.length} products selected`);
    } else {
      setAnnouncement("");
    }
  }, [selectedProducts]);

  useEffect(() => {
    let items;

    if (filteredProducts.length > 0) {
      setItems(filteredProducts);
      items = filteredProducts;
    } else {
      setItems(products);
      items = products;
    }

    if (items?.length > 0) {
      if (sortSelected[0] == "product asc") {
        items = items.sort((a, b) => {
          if (!a.title || !b.title) return false;
          return a.title.localeCompare(b.title);
        });
        setItems(items);
      } else if (sortSelected[0] == "product desc") {
        items = items.sort((a, b) => {
          if (!a.title || !b.title) return false;
          return b.title.localeCompare(a.title);
        });
        setItems(items);
      }
    }

    if (queryValue != "") {
      const queriedItems = items.filter(
        (item: any) =>
          item.title.toLowerCase().includes(queryValue.toLowerCase()) ||
          item.sku.toLowerCase().includes(queryValue.toLowerCase()),
      );
      setItems(queriedItems);
    }
  }, [filteredProducts, products, sortSelected, queryValue]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setInit(true);
    const data = await getProducts(appUrl);
    const fetchedData = data?.data.products
      .map((product: any) => {
        return {
          id: product.Itemcode,
          title: product.Description,
          sku: product.Itemcode,
          brand:
            product.Tags.find((tag: any) => tag.Code == "Brand")?.Values[0]
              .Description_EN || "",
          price: (product.Salesprice * 26).toFixed(2),
          collection:
            product.Tags.find((tag: any) => tag.Code == "Collection")?.Values[0]
              .Description_EN || "",
          color:
            product.Tags.find((tag: any) => tag.Code == "ColourPlanter")
              ?.Values[0].Description_EN || undefined,
          material:
            product.Tags.find((tag: any) => tag.Code == "Material")?.Values[0]
              .Description_EN || "",
          weight: product.Weight.toFixed(2) || null,
          length: product.Length || null,
          width: product.Width || null,
          height: product.Height || null,
          depth: product.Depth || null,
          diameter: product.Diameter || null,
          opening: product.Opening || null,
          image:
            "https://images.nieuwkoop-europe.com/images/" +
            product.ItemPictureName,
          matchingElement: removeSizeInTitles(product?.ItemVariety_EN) || null,
          itemStatus: product.ItemStatus,
          isStockItem: product.IsStockItem,
          mainGroupCode: product.MainGroupCode,
          deliveryTime: product.DeliveryTimeInDays,
          searchUrl: `https://www.nieuwkoop-europe.com/en/search-results?q=${product.Itemcode}`,
          adminUrl:
            process.env.NODE_ENV == "development"
              ? API_ROUTES.SHOPIFY_ADMIN_URL_DEV
              : API_ROUTES.SHOPIFY_ADMIN_URL_PROD,
          type: product.ProductGroupDescription_EN,
        };
      })
      .sort((a: any, b: any) => {
        if (!a.matchingElement || !b.matchingElement) return false;
        return a.matchingElement.localeCompare(b.matchingElement);
      });

    setInit(false);
    setProducts(fetchedData);
  };

  useEffect(() => {
    filterProducts(productType[0]);
  }, [products, productType]);

  const filterProducts = (type: string) => {
    let filteredItems =
      type != ""
        ? products.filter((product: any) => product.type == type)
        : products;

    // get all unique brands and collections
    const brands = [
      ...new Set(filteredItems.map((product: any) => product.brand)),
    ]
      .filter((brand) => brand != "")
      .map((brand) => ({ label: brand, value: brand }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const collections = [
      ...new Set(filteredItems.map((product: any) => product.collection)),
    ]
      .filter((collection) => collection != "")
      .map((collection) => ({ label: collection, value: collection }))
      .sort((a, b) => a.label.localeCompare(b.label));

    setBrands(brands);
    setCollections(collections);
    setSelectedProducts([]);
    setItems(filteredItems);
    setCurrentPage(1);
    setDisplayedProducts(filteredItems.slice(0, itemsPerPage));
  };

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(items);

  const rowMarkup = displayedProducts.map(
    (
      {
        id,
        title,
        sku,
        price,
        image,
        brand,
        collection,
        matchingElement,
        itemStatus,
        deliveryTime,
        searchUrl,
        adminUrl,
      },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={sku}
        selected={selectedResources.includes(id)}
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
        <IndexTable.Cell>
          <Link onClick={() => window.open(searchUrl)}>{sku}</Link>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {variants.some((variant) => variant.sku == sku) ? (
            <Link
              onClick={() =>
                window.open(
                  `${adminUrl}products/${variants.find((variant) => variant.sku == sku)?.productId}`,
                )
              }
            >
              View
            </Link>
          ) : (
            ""
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>{brand}</IndexTable.Cell>
        <IndexTable.Cell>{collection}</IndexTable.Cell>
        <IndexTable.Cell>{matchingElement}</IndexTable.Cell>
        <IndexTable.Cell>{price}</IndexTable.Cell>
        <IndexTable.Cell>{getItemStatus(itemStatus)}</IndexTable.Cell>
        <IndexTable.Cell>{deliveryTime}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const handleSelectBrands = useCallback((value: any) => {
    setFilteredBrands(value);
    setFilteredCollections([]);
  }, []);

  const handleSelectCollections = useCallback((value: any) => {
    setFilteredCollections(value);
    setFilteredBrands([]);
  }, []);

  const handleSelectProductType = useCallback((value: any) => {
    setProductType(value);
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
    setSelectedProducts([]);
  }, [filteredBrands, filteredCollections, products]);

  useEffect(() => {
    if (selectedResources.length > 0) {
      let selectedFilteredProducts = [] as any;
      if (filteredProducts.length > 0) {
        selectedFilteredProducts = filteredProducts.filter((product) =>
          selectedResources.includes(product.id),
        );
      } else if (products.length > 0) {
        selectedFilteredProducts = products.filter((product) =>
          selectedResources.includes(product.id),
        );
      }
      if (selectedFilteredProducts.length == products.length) {
        setSelectedProducts([]);
      } else {
        setSelectedProducts(selectedFilteredProducts);
      }
    } else {
      setSelectedProducts([]);
    }
  }, [selectedResources, filteredProducts, products]);

  const sortOptions: IndexFiltersProps["sortOptions"] = [
    { label: "Product", value: "product asc", directionLabel: "A-Z" },
    { label: "Product", value: "product desc", directionLabel: "Z-A" },
  ];

  useEffect(() => {
    const fetchVariants = async () => {
      let data = await getAllVariants(appUrl);
      let variants = data?.data.variants;
      let variantsObj = variants.map((variant: any) => {
        return {
          productId: variant.node.product.id.replace(
            "gid://shopify/Product/",
            "",
          ),
          sku: variant.node.sku,
        };
      });
      setVariants(variantsObj);
    };

    fetchVariants();
  }, [appUrl]);

  return (
    <Page>
      <>
        {init && (
          <Banner>
            <p>Products are loading</p>
          </Banner>
        )}
        {announcement != "" && (
          <Banner>
            <p>{announcement}</p>
          </Banner>
        )}
        <Page fullWidth>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
              <Card title="Types" sectioned>
                <Scrollable style={{ height: "200px" }}>
                  <OptionList
                    title="Types"
                    onChange={handleSelectProductType}
                    options={PRODUCT_TYPES}
                    selected={productType}
                  />
                </Scrollable>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
              <Card title="Brands" sectioned>
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
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
              <Card title="Collections" sectioned>
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
                      content: `Import filtered products - in total ${selectedProducts.length} items`,
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
            <IndexFilters
              sortOptions={sortOptions}
              sortSelected={sortSelected}
              queryValue={queryValue}
              queryPlaceholder="Search products"
              onQueryChange={handleFiltersQueryChange}
              onQueryClear={() => setQueryValue("")}
              onSort={setSortSelected}
              // primaryAction={primaryAction}
              cancelAction={{
                onAction: onHandleCancel,
                disabled: false,
                loading: false,
              }}
              tabs={[]}
              selected={selected}
              onSelect={setSelected}
              filters={[]}
              // appliedFilters={appliedFilters}
              onClearAll={handleFiltersClearAll}
              mode={mode}
              setMode={setMode}
            />
            <IndexTable
              condensed={useBreakpoints().smDown}
              resourceName={resourceName}
              itemCount={items.length}
              selectable={true}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Image" },
                { title: "Product" },
                { title: "Sku" },
                { title: "Imported" },
                { title: "Brand" },
                { title: "Collection" },
                { title: "Variety" },
                { title: "Price Kč" },
                { title: "Status" },
                { title: "Delivery days" },
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

  function isEmpty(value: string | string[]): boolean {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === "" || value == null;
    }
  }
}

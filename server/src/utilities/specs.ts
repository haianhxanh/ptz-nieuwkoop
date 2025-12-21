import { BOOLEAN_PROPERTIES, EN_TAG_CODES, MAIN_SPECS, SIZES, TAGS, TAG_CODES, UNTRANSLATED_TAGS } from "./constants";
import { capitalizeFirstLetter } from "./helper";

export async function getTag(tagsObj: any) {
  let tag = "";
  if (!EN_TAG_CODES.includes(tagsObj.Code)) {
    if (TAG_CODES[tagsObj.Code]) {
      for (const [index, value] of tagsObj.Values.entries()) {
        let tagENValue = value?.Description_EN;
        let tagCZValue = TAG_CODES[tagsObj.Code][tagENValue];
        if (tagCZValue) {
          tag += tagCZValue;
          if (index < tagsObj.Values.length - 1) {
            tag += ", ";
          }
        }
      }
    }
  } else {
    for (const value of tagsObj.Values) {
      tag += value.Description_EN + ", ";
    }
  }

  return capitalizeFirstLetter(tag) || "";
}

const appendSpec = (specs: string, label: string, value: any, unit: string = ""): string => {
  return value ? `${specs}<p>${label}: ${value} ${unit}</p>` : "";
};

// const getTagValue = async (tags: any, tagCode: string) => {
//   return await getTag(tags, tagCode);
// };

export const createVariantSpecs = async (matchingVariant: any) => {
  let mainSpecs = "";
  let tagSpecs = "";

  for (const spec of UNTRANSLATED_TAGS) {
    if (matchingVariant.Tags && matchingVariant.Tags.find((tag: any) => tag.Code == spec.tagCode)) {
      mainSpecs = appendSpec(mainSpecs, spec.label, matchingVariant.Tags.find((tag: any) => tag.Code == spec.tagCode).Values[0].Description_EN, "");
    }
  }

  for (const spec of MAIN_SPECS) {
    if (matchingVariant[spec.value] && matchingVariant[spec.value] > 0) {
      mainSpecs = appendSpec(mainSpecs, spec.label, matchingVariant[spec.value], spec.unit);
    }
  }

  for (const spec of TAGS) {
    if (matchingVariant.Tags && matchingVariant.Tags.find((tag: any) => tag.Code == spec.tagCode)) {
      let tagsObj = matchingVariant.Tags.find((tag: any) => tag.Code == spec.tagCode);

      let tag = await getTag(tagsObj);
      tag.replace(/,\s*$/, "");

      tagSpecs = appendSpec(tagSpecs, spec.label as string, tag, "");
    }
  }

  let variantSpecs = mainSpecs + tagSpecs;

  for (const property of BOOLEAN_PROPERTIES) {
    const matchingTag = matchingVariant.Tags?.find((tag: any) => tag.Code === property.property);
    const hasPropertyValue = matchingTag?.Values?.some((value: any) => value.Description_EN === property.value);
    const propertyValue = hasPropertyValue ? property.labelPositive : property.labelNegative;
    variantSpecs = appendSpec(variantSpecs, property.label, propertyValue, "");
  }

  if (variantSpecs.includes(",  </p>")) {
    variantSpecs = variantSpecs.replace(",  </p>", "</p>");
  }
  return variantSpecs;
};

export const removeSizeInTitles = (title: string) => {
  if (!title) {
    return "";
  }
  SIZES.forEach((size) => {
    title = title.replace(size, " ");
  });
  return title;
};

export const extractSizeInTitles = (title: string) => {
  let size = "";
  SIZES.forEach((s) => {
    if (title.includes(s)) {
      size = s.replace(",", "").replace(" ", "");
    }
  });
  return size;
};

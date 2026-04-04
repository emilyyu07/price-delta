export function parseUrl(rawUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL provided");
  }

  const cleanUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
  const match = parsedUrl.pathname.match(/\/(\d+)\.html$/);
  const externalId = match ? match[1] : null;

  if (!externalId) {
    throw new Error("Could not extract Aritzia Product ID from URL");
  }

  return {
    cleanUrl,
    externalId,
  };
}

/* CURRENTLY ONLY SUPPORTS ARITZIA, BUT THIS CAN BE EXPANDED TO OTHER RETAILERS IN THE FUTURE */
export function extractStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname;

    // split the hostname by periods
    const parts = hostname.split(".");

    // filter out common subdomains and top-level domains
    const ignoreList = [
      "www",
      "shop",
      "store",
      "com",
      "ca",
      "co",
      "uk",
      "org",
      "net",
    ];

    const meaningfulParts = parts.filter((part) => !ignoreList.includes(part));

    if (meaningfulParts.length > 0) {
      const brand = meaningfulParts[0]!;
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }

    return "Unknown Retailer";
  } catch (error) {
    return "Unknown Retailer";
  }
}

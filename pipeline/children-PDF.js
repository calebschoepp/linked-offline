const puppeteer = require("puppeteer");
const fs = require("fs");

if (process.argv.length != 3) {
  console.log(
    `${process.argv.length} Is an improper number of command line arguments`
  );
  process.exit(1);
}

const linksFilePath = "./" + process.argv[2];
const linkInfos = JSON.parse(fs.readFileSync(linksFilePath, "utf8"));

// Generate PDFs
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (let linkInfo of linkInfos) {
    if (
      fs.existsSync(linkInfo.id) ||
      linkInfo.href.indexOf("unsubscribe") > -1
    ) {
      console.log(`Skipping child PDF ${linkInfo.id}..`);
      continue;
    }
    console.log(`Generating child PDF ${linkInfo.id}...`);
    try {
      await page.goto(linkInfo.href, { waitUntil: "networkidle2" });
      await page.pdf({ path: linkInfo.id, format: "A4" });
    } catch (error) {
      console.log(`ERROR: Creation of ${linkInfo.id} failed`);
      linkInfo.id = "FAILED";
    }
  }

  await browser.close();
})();

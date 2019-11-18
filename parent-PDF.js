const puppeteer = require("puppeteer");
const devices = require("puppeteer/DeviceDescriptors");
const pixel = devices["Pixel 2"];
const fs = require("fs");

if (process.argv.length != 3) {
  console.log(
    `${process.argv.length} Is an improper number of command line arguments`
  );
  process.exit(1);
}
const parentHTMLFile = "file://" + process.cwd() + "/" + process.argv[2];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.emulate(pixel);
  await page.goto(parentHTMLFile, {
    waitUntil: "networkidle2"
  });

  // Potentially want to move to non hashing system in future
  console.log("Parsing link info...");
  let linkInfos = await page.$$eval("a", as =>
    as.map(a => {
      return {
        href: a.href,
        text: a.textContent,
        id: ""
      };
    })
  );
  for (let i = 0; i < linkInfos.length; i++) {
    linkInfos[i].id = i.toString() + ".pdf";
  }
  linkInfos = linkInfos.filter(e => e.text != "");

  fs.writeFileSync("links.json.tmp", JSON.stringify(linkInfos), "utf8");

  console.log("Generating Parent PDF...");
  await page.pdf({ path: "parent.pdf", format: "A4" });

  await browser.close();
})();

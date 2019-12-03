"use strict";

module.exports.parseEmail = async event => {
  let body;
  if (event.body) {
    body = JSON.parse(event.body);
  } else {
    console.error("No body to parse");
    return {
      statusCode: 400,
      body: "Event had no body"
    };
  }

  if (!body.strippedHTML) {
    return {
      statusCode: 400,
      body: "Body has no strippedHTML"
    };
  }
  const cheerio = require("cheerio");
  const $ = cheerio.load(body.strippedHTML);
  let links = $("a");
  $(links).each(function(i, link) {
    console.log($(link).text() + ":\n  " + $(link).attr("href"));
  });

  return {
    statusCode: 200,
    body: "Well done Caleb"
  };
};

module.exports.urlToPdf = async event => {
  const chromium = require("chrome-aws-lambda");
  const puppeteer = require("puppeteer-core");
  const fs = require("fs");
  const crypto = require("crypto");
  const AWS = require("aws-sdk");
  const S3 = new AWS.S3();

  const bucket = "url-pdfs";

  const url = "https://www.render.com";
  const urlHash = crypto
    .createHash("md5")
    .update(url)
    .digest("hex");
  const filename = urlHash + ".pdf";
  const filepath = "/tmp/" + filename;

  // Generate PDF stream
  const executablePath = event.isOffline
    ? "/home/caleb/linked-offline/test-pipeline/node_modules/puppeteer/.local-chromium/linux-706915/chrome-linux/chrome"
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: ["networkidle0", "load", "domcontentloaded"]
  });

  const pdfStream = await page.pdf();
  console.log("Stream generated");

  // Write PDF stream to /tmp
  await new Promise(resolve => {
    let writeStream = fs.createWriteStream(filepath);
    writeStream.write(pdfStream);
    writeStream.on("finish", () => {
      console.log("Success writing file");
      resolve();
    });
    writeStream.end();
  });

  // Optimize PDF file with Ghostscript
  // TODO

  // Load PDF file into stream
  const optimizedPdfStream = fs.readFileSync(filepath);

  // Upload PDF to S3
  console.log("Uploading file to S3");
  try {
    const S3Reponse = await S3.putObject({
      Body: optimizedPdfStream,
      Bucket: bucket,
      ContentType: "application/pdf",
      Key: filename
    }).promise();
    console.log(S3Reponse);
    return {
      statusCode: 200,
      body: "Object successfully posted"
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      body: "Error in posting object"
    };
  }
};

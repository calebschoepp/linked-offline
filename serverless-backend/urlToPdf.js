"use strict";

const pdfGen = require("./pdfGen");
const crypto = require("crypto");
const request = require("request");
const S3bucket = "url-pdfs"; // TODO replace with environment vars

module.exports.handler = async event => {
  // TODO -- Try/catch error handling

  // Extract url from event and follow redirects to final url
  const startUrl = "https://google.com"; // TODO
  console.log(`Starting with ${startUrl}`);
  const url = await finalUrl(startUrl);
  console.log(`Redirected to ${url}`);

  // Generate name for pdf from MD5 hash
  const name = nameFromHash(url);
  console.log(`Using name ${name}`);

  // Check to see if pdf is already cached in S3
  // This is done for url based pdfs because they will not change
  if (await pdfGen.pdfExsists(S3bucket, name)) {
    // Pdf already is in S3 so gracefully finish
    console.log(`${name} already in ${S3bucket}`);
    return "Already in S3"; // TODO
  }

  // Pdf does not exsist in S3 so generate it with Puppeteer
  console.log("Generating pdf stream");
  const pdfStream = await pdfGen.urlToPdf(url);

  // Optimize the pdf stream with ghostscript
  console.log("Optimizing pdf stream");
  const optimizedPdfStream = await pdfGen.optimizePdf(pdfStream, name);

  // Store the pdf in S3
  console.log(`Storing in ${S3bucket}`);
  await pdfGen.uploadPdf(optimizedPdfStream, name, S3bucket);

  return "Success"; // TODO
};

// Creates a unique and consistent name for a file with a MD5 hash
function nameFromHash(u) {
  return crypto
    .createHash("md5")
    .update(u)
    .digest("hex");
}

// Get the final url in a chain of redirects
function finalUrl(url) {
  return new Promise((resolve, reject) => {
    request.get(url, function(err, res, body) {
      if (err) {
        reject(err);
      }
      resolve(res.request.uri.href);
    });
  });
}

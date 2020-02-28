"use strict";

const pdfGen = require("./pdfGen");
const crypto = require("crypto");
const S3bucket = "html-pdfs"; // TODO replace with environment vars

module.exports.handler = async event => {
  // TODO -- Try/catch error handling

  // Extract html from event TODO
  const html = event.html;

  // Generate name for pdf from MD5 hash
  // TODO - generate name some other way
  const name = nameFromHash(html);
  console.log(`Using name ${name}`);

  // Generate pdf with Puppeteer
  console.log("Generating pdf stream");
  const pdfStream = await pdfGen.htmlToPdf(html);

  // Optimize the pdf stream with ghostscript
  console.log("Optimizing pdf stream");
  const optimizedPdfStream = await pdfGen.optimizePdf(pdfStream, name);

  // Store the pdf in S3
  console.log(`Storing in ${S3bucket}`);
  await pdfGen.uploadPdf(optimizedPdfStream, name, S3bucket);

  return name; // TODO
};

// Creates a unique and consistent name for a file with a MD5 hash
function nameFromHash(u) {
  return crypto
    .createHash("md5")
    .update(u)
    .digest("hex");
}

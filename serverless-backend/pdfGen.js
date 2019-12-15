const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const AWS = require("aws-sdk");
const S3 = new AWS.S3();

// Tooling used by both html and url to pdf functions
module.exports = {
  pdfExsists: async function(S3bucket, name) {
    // Check to see if pdf already is in S3
    const filename = name + ".pdf";

    try {
      await S3.headObject({ Bucket: S3bucket, Key: filename }).promise();
      return true;
    } catch (err) {
      return false;
    }
  },
  urlToPdf: async function(url) {
    // Converts a url into a pdf stream
    const pdfStream = await makePdf({ url: url, html: null });
    return pdfStream;
  },
  htmlToPdf: async function(html) {
    // Converts html into a pdf stream
    const pdfStream = await makePdf({ url: null, html: html });
    return pdfStream;
  },
  optimizePdf: async function(pdfStream, name = "temporaryPDF") {
    // Optimize a given pdf stream using ghostscript
    const filepath = `/tmp/${name}`;
    const compressedFilepath = filepath + ".comp";

    // First write the file to disk at /tmp
    await new Promise((resolve, reject) => {
      let writeStream = fs.createWriteStream(filepath);
      writeStream.write(pdfStream);
      writeStream.on("finish", () => {
        resolve();
      });
      writeStream.on("error", () => {
        reject("Failed to write pdf file to /tmp");
      });
      writeStream.end();
    });

    // Optimize pdf file with ghostscript
    let gsPath = process.env.IS_LOCAL
      ? "/home/caleb/linked-offline/serverless-backend/bin/gs"
      : process.env.LAMBDA_TASK_ROOT + "/bin/gs"; // TODO handle offline better
    if (process.env.LAMBDA_TASK_ROOT) {
      process.env.PATH = `${process.env.PATH}:${process.env.LAMBDA_TASK_ROOT}/bin`;
    }

    const args = [
      gsPath,
      "-sDEVICE=pdfwrite",
      "-dPDFSETTINGS=/screen",
      "-dCompatibilityLevel=1.4",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=" + compressedFilepath,
      filepath
    ];
    await exec(args.join(" "));

    const optimizedPdfStream = fs.readFileSync(compressedFilepath);

    // Cleanup files
    fs.unlinkSync(filepath);
    fs.unlinkSync(compressedFilepath);

    return optimizedPdfStream;
  },
  uploadPdf: async function(pdfStream, name, S3bucket) {
    // Upload the newly formed pdf stream to S3
    const filename = name + ".pdf";

    const S3Reponse = await S3.putObject({
      Body: pdfStream,
      Bucket: S3bucket,
      ContentType: "application/pdf",
      Key: filename
    }).promise();
  }
};

async function makePdf(input) {
  // Generate PDF stream
  // TODO handle offline better here -- false used to be event.isOffline
  const executablePath = false
    ? "/home/caleb/linked-offline/test-pipeline/node_modules/puppeteer/.local-chromium/linux-706915/chrome-linux/chrome"
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();

  const pageOpt = { waitUntil: ["networkidle0", "load", "domcontentloaded"] };

  if (input.url) {
    await page.goto(input.url, pageOpt);
  } else if (input.html) {
    await page.setContent(input.html, pageOpt);
  } else {
    throw Error("No url or html passed to generate pdf from");
  }

  const pdfStream = await page.pdf();

  return pdfStream;
}

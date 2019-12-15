"use strict";

module.exports.parseEmail = async event => {
  console.log("parseEmail");
  console.log(event);
  return {
    html: "<div>Hello World!</div>",
    urls: [
      "https://www.npmjs.com/package/serverless-pseudo-parameters",
      "https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-common-fields.html",
      "https://www.npmjs.com/package/serverless-step-functions#simple-event-definition"
    ]
  };
};

module.exports.urlToPdf = async event => {
  console.log("urlToPdf");
  console.log(event);
};

module.exports.htmlToPdf = async event => {
  console.log("htmlToPdf");
  console.log(event);
  return {
    htmlPdfName: "af8e9d9a9f9a9aa7a5a2d5"
  };
};

module.exports.mergePdf = async event => {
  console.log("mergePdf");
  console.log(event);
};

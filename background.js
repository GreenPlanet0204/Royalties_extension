var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
class PmrReportRequestor {
  // let r = await fetch("https://kdpreports.amazon.com/download/report/royaltiesestimator/en_US/royaltiesEstimatorReport.xslx", {
  //     "credentials": "include",
  //     "headers": {
  //         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0",
  //         "Accept": "application/json, text/javascript, */*; q=0.01",
  //         "Accept-Language": "en-GB,en;q=0.5",
  //         "Content-Type": "application/json",
  //         "X-Csrf-Token": "hFs6CSU5EyePj+Sfv9CKJoot5K+GkYifjydP9+sUVRYtAAAAAGOTomQAAAAC",
  //         "X-Requested-With": "XMLHttpRequest",
  //         "Sec-Fetch-Dest": "empty",
  //         "Sec-Fetch-Mode": "cors",
  //         "Sec-Fetch-Site": "same-origin"
  //     },
  //     "referrer": "https://kdpreports.amazon.com/royalties",
  //     "body": "{\"reportStartDate\":\"2022-12-01T00:00:00Z\",\"reportEndDate\":\"2022-12-09T23:59:59Z\",\"reportGranularity\":\"DAY\",\"reportType\":\"royalties\",\"authors\":null,\"asins\":null,\"formats\":null,\"marketplaces\":null,\"distribution\":null}",
  //     "method": "POST",
  //     "mode": "cors"
  // });
  // console.log(r)
  constructor() {
    this.syncHeartbeat = () => {
      if (this.abortSync) throw new Error("Abort Sync Trigger Detected!");
      this.syncHeartbeat = new Date();
    };
    this.setKpdReportInterceptor = () => {
      console.log("Starting extension...");
      let refererUrl = "https://kdpreports.amazon.com/"; // may need to add `dashboard` after trailing slash
      let ruleIdString = Math.floor(Math.random() * 999999999).toString();
      let ruleId = parseInt(ruleIdString);
      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
          {
            id: ruleId,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: refererUrl },
              ],
            },
            condition: {
              urlFilter: "https://kdpreports.amazon.com/", // may need to add * after trailing /
              // "resourceTypes": ["xmlhttprequest"]
            },
          },
        ],
      });
    };
    this.makeAmazonRequest = (
      url,
      httpMethod,
      data,
      headers,
      acceptableStatuses,
      preventRetry
    ) =>
      __awaiter(this, void 0, void 0, function*() {
        if (!headers) {
          headers = {};
        }
        try {
          let response = yield fetch(url, {
            method: httpMethod,
            headers: headers,
            body: data,
            credentials: "include",
          });
          // let response = yield r.default.request({ method: httpMethod, url: url, headers: headers, data: data, withCredentials: true });
          let responseHeaders = response.headers;
          for (const header in responseHeaders) {
            "Set-Cookie" === header && console.info("Found set cookie header");
          }
          const responseURL = response.url; // the request URL after any redirects
          if (
            this.amazonRateLimtMultiplier &&
            this.amazonRateLimtMultiplier > 1000
          ) {
            this.amazonRateLimtMultiplier -= 1000;
          } else {
            this.amazonRateLimtMultiplier = 0;
          }
          if (responseURL.includes("signin")) {
            console.warn("Requires Amazon reauthentication");
            return undefined;
          } else {
            return response;
          }
        } catch (erroredRequest) {
          console.error(erroredRequest);
          if (
            acceptableStatuses &&
            erroredRequest &&
            erroredRequest.response &&
            acceptableStatuses.includes(erroredRequest.response.status)
          ) {
            return erroredRequest.response;
          }
          if (
            erroredRequest &&
            erroredRequest.response &&
            401 === erroredRequest.response.status
          ) {
            throw (console.warn("Requires Amazon reauthentication 401"),
            "Requires amazon reauth 401");
          }
          if (
            erroredRequest &&
            erroredRequest.response &&
            erroredRequest.response &&
            (429 == erroredRequest.response.status ||
              ("string" == typeof erroredRequest.response &&
                erroredRequest.response.includes("frequently")))
          ) {
            if (this.amazonRateLimtMultiplier) {
              this.amazonRateLimtMultiplier += 1000;
            } else {
              this.amazonRateLimtMultiplier = 1000;
            }
            console.warn(
              `Hit Amazon rate limit, waiting ${this.amazonRateLimtMultiplier}ms`
            );
            // await new Promise((e) => setTimeout(e, (this as any).amazonRateLimtMultiplier)); // TODO: I don't understand what this does.
            console.info("Retrying request (Rate Limit)");
            return yield this.makeAmazonRequest(
              url,
              httpMethod,
              data,
              headers,
              acceptableStatuses,
              preventRetry
            );
          }
          if (!preventRetry) {
            console.info("Retrying request");
            return yield this.makeAmazonRequest(
              url,
              httpMethod,
              data,
              headers,
              [],
              true
            );
          }
          throw (console.error(erroredRequest), erroredRequest);
        }
      });
    this.getCustomerMetadata = (csrf) =>
      __awaiter(this, void 0, void 0, function*() {
        if (!csrf) {
          throw new Error("CSRF token not set");
        }
        try {
          const url =
            "https://kdpreports.amazon.com/api/v2/reports/customerMetadata";
          const headers = {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "X-Csrf-Token": csrf,
            "X-Requested-With": "XMLHttpRequest",
          };
          let response = yield fetch(url, {
            method: "GET",
            headers: headers,
            credentials: "include",
          });
          const responseURL = response.url; // the request URL after any redirects
          if (responseURL.toLowerCase().includes("signin")) {
            return undefined;
          } else {
            return response.json();
          }
        } catch (error) {
          console.error(`Could not get customer metadata: ${error}`);
          return undefined;
        }
      });
    this.retrieveCsrfToken = () =>
      __awaiter(this, void 0, void 0, function*() {
        this.syncHeartbeat();
        try {
          const response = yield this.makeAmazonRequest(
            "https://kdpreports.amazon.com/dashboard",
            "GET",
            null,
            undefined,
            undefined,
            false
          );
          const csrf = (yield response.text())
            .split('csrftoken":{"token":"')[1]
            .split('"')[0];
          return csrf;
        } catch (error) {
          console.error(`Could not retrieve CSRF: ${error}`);
          return undefined;
        }
      });
    this.getAccountCreationDateFromCustomerMetadata = function(
      customerMetadata
    ) {
      const accountCreationDateInfo = customerMetadata.accountCreationDate.split(
        "-"
      );
      const year = accountCreationDateInfo[0];
      const month = accountCreationDateInfo[1];
      return new Date(Date.UTC(parseInt(year), parseInt(month))); // We only care about the year and month.
    };
    this.guessLatestReportDate = () => {
      let now = new Date();
      now = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );
      let guessForLatestReportDate = now;
      // The report must come out on the 15th, so set the date to last month or the month before.
      now.getUTCDate() < 15
        ? guessForLatestReportDate.setUTCMonth(
            guessForLatestReportDate.getUTCMonth() - 2
          )
        : guessForLatestReportDate.setUTCMonth(
            guessForLatestReportDate.getUTCMonth() - 1
          );
      guessForLatestReportDate.setUTCDate(15);
      return guessForLatestReportDate;
    };
    this.getAllPmrReports = () =>
      __awaiter(this, void 0, void 0, function*() {
        // Get some data before making the report. This could be moved to an on-init method.
        const csrf = yield this.retrieveCsrfToken();
        if (!csrf) {
          return undefined;
        }
        const customerMetadata = yield this.getCustomerMetadata(csrf);
        if (!customerMetadata) {
          return undefined;
        }
        const accountCreationDate = this.getAccountCreationDateFromCustomerMetadata(
          customerMetadata
        );
        const latestReportDate = this.guessLatestReportDate();
        // Calculate the number of months between account creation and latest report.
        // First, determine the # of years since the user created their account. Multiple by 12 to get the # of months. This goes from the start-end of the year range.
        let numberOfMonths =
          12 *
          (latestReportDate.getFullYear() - accountCreationDate.getFullYear());
        // Subtract off the number of months in the year before they created their account.
        numberOfMonths -= accountCreationDate.getMonth() + 1;
        // Add the number of months since the latest report was generated. (is this right???)
        numberOfMonths += latestReportDate.getMonth();
        // Make sure the result is >= 0;
        numberOfMonths <= 0 ? 0 : numberOfMonths;
        // Let's get some reports!
        // Note: In the publicwise version, they only retrieved reports that they didn't already have.
        //   This version gets all the reports. We could (instead) just get the report for this month. That would be much easier, but the code is already written for this version.
        console.log("Iterating months: ", numberOfMonths);
        for (
          let iterativeMonth = 0;
          iterativeMonth <= numberOfMonths;
          iterativeMonth++
        ) {
          let iterativeDate = new Date(accountCreationDate);
          iterativeDate.setUTCMonth(
            iterativeDate.getUTCMonth() + iterativeMonth
          );
          const pmrReportUrl = yield this.getPmrReportUrl(iterativeDate);
          console.log(`New report URL: ${pmrReportUrl}`);
          // TODO: Send report URL to server so it can download the report. The URL has an expiration time, and may only be able to be accessed once.
        }
      });
    this.setKpdReportInterceptor();
  }
  getPmrReportUrl = (reportDate) =>
    __awaiter(this, void 0, void 0, function*() {
      const splitReportDate = reportDate.toISOString().split("-");
      console.debug(
        `Syncing PMR: ${reportDate.toISOString()} | ${splitReportDate[0]}-${
          splitReportDate[1]
        }`
      );
      const url =
        "https://kdpreports.amazon.com/download/report/pmr/en_US/pmrReport.xslx";
      const requestParams = `?selectedMonth=${splitReportDate[0]}-${splitReportDate[1]}&reportType=KDP_PMR`;
      let response = yield this.makeAmazonRequest(
        url + requestParams,
        "GET",
        null,
        { Accept: "application/json, text/javascript, */*; q=0.01" },
        undefined,
        false
      );
      let retryCount = 0;
      while (!response.url && retryCount < 300) {
        console.log("waiting 2 seconds...");
        yield new Promise((e) => setTimeout(e, 2000)); // wait 2 seconds before retrying
        this.syncHeartbeat();
        response = yield this.makeAmazonRequest(
          url + requestParams,
          "GET",
          null,
          { Accept: "application/json, text/javascript, */*; q=0.01" },
          undefined,
          false
        );
        retryCount++;
      }
      if (!response.url) {
        console.error("Dashboard max tries exceeded");
        return undefined;
      }
      const kdpReportUrl = response.url; // This is an S3 url where the report can be accessed.
      return kdpReportUrl;
    });
}
const reporter = new PmrReportRequestor();
setTimeout(() => {
  reporter.getAllPmrReports().then(() => {
    console.log("Done!");
  });
}, 5000);

async function f() {
    let r = await fetch("https://kdpreports.amazon.com/download/report/royaltiesestimator/en_US/royaltiesEstimatorReport.xslx", {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-GB,en;q=0.5",
            "Content-Type": "application/json",
            "X-Csrf-Token": "hFs6CSU5EyePj+Sfv9CKJoot5K+GkYifjydP9+sUVRYtAAAAAGOTomQAAAAC",
            "X-Requested-With": "XMLHttpRequest",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
        },
        "referrer": "https://kdpreports.amazon.com/royalties",
        "body": "{\"reportStartDate\":\"2022-12-01T00:00:00Z\",\"reportEndDate\":\"2022-12-09T23:59:59Z\",\"reportGranularity\":\"DAY\",\"reportType\":\"royalties\",\"authors\":null,\"asins\":null,\"formats\":null,\"marketplaces\":null,\"distribution\":null}",
        "method": "POST",
        "mode": "cors"
    });
    console.log(r)
    console.log(await r.text())
    return r;
}

f().then((response) => {
    console.log("SUCCESS!");
}).catch((error) => {
    console.error(error);
});

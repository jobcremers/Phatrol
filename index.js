const puppeteer = require('puppeteer');
const request = require('request-promise-native');
const poll = require('promise-poller').default;

const siteDetails = {
    sitekey: '6LdWXicTAAAAAKIdor4xQ_gzgD-LgDP3siz7cop6',
    pageurl: 'https://login.yahoo.com/account/challenge/recaptcha'
};


(async function main() {

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-web-security',
            '--user-data-dir=H:\\test'
        ],
    });
    const page = await browser.newPage();

    function generatePassword() {
        let length = 8,
            charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@$",
            retVal = "";
        for (var i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }

        return retVal + "$!";
    }

    function random() {
        var length = 3,
            charset = "1234567890",
            retVal = "";
        for (var i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    }

    const https = require('https');
    const httpGet = url => {
        return new Promise((resolve, reject) => {
            https.get(url, res => {
                res.setEncoding('utf8');
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve(body));
            }).on('error', reject);
        });
    };
    const body = await httpGet('https://api.namefake.com');
    var jsonObject = JSON.parse(body);
    var names_combinded = jsonObject.name;
    var birthdate_combined = jsonObject.birth_data;
    var dates = birthdate_combined.split("-");
    var names = names_combinded.split(" ");
    const firstname = names[0];
    const lastname = names[1];
    let b_year = dates[0];
    const b_month_unformatted = dates[1];
    var b_month = (b_month_unformatted * 1).toString();
    const b_day = dates[2];

    if (b_year >= "2002") {
        b_year = "1988";
    }

    const randoms = random();




    async function startProcess() {
        const getNum = await httpGet('https://sms-activate.ru/stubs/handler_api.php?api_key=940054f3775c2e49f71fd64c4c3ef116&action=getNumber&service=mb&ref=839469&country=6');
        if (getNum === "NO_BALANCE" || getNum === "NO_NUMBERS") {
            await browser.close();
            return console.log("Error! CAN NOT activate SMS!");
        }
        const data = getNum.split(":");
        const id = data[1];
        const num = data[2].substr(2);


        function requestSMS(id) {
            const getSMS = httpGet(`https://sms-activate.ru/stubs/handler_api.php?api_key=940054f3775c2e49f71fd64c4c3ef116&action=getFullSms&id=${id}`);
            if (getSMS === "STATUS_WAIT_CODE" || "STATUS_CANCEL") {
                return requestSMS(id);
            } else {
                //const data = getSMS.split(":");
                return getSMS;
            }
        }

        const c2apiKey = "8d1ffc723363da12c6847c2f770bd2bc";
        const pass = generatePassword();
        await page.setDefaultNavigationTimeout(0)

        await page.setExtraHTTPHeaders({
            'Access-Control-Allow-Origin': '*'
        });

        await page.goto('https://login.yahoo.com/account/create');
        await page.type('#usernamereg-firstName', firstname);
        await page.type('#usernamereg-lastName', lastname);
        const email = firstname + lastname + "xo" + randoms;
        await page.type('#usernamereg-yid', email);
        await page.click('#usernamereg-freeformGender');
        await page.select('[name="shortCountryCode"]', 'ID');
        await page.type('#usernamereg-phone', num);
        await page.select('#usernamereg-month', b_month);
        await page.type('#usernamereg-day', b_day);
        await page.type('#usernamereg-year', b_year);
        await page.type('#usernamereg-password', pass);
        await page.click('#reg-submit-button');

        const cur_url = await page.url();
        if (cur_url.includes("https://login.yahoo.com/account/challenge/phone-verify")) {
            await page.waitForSelector('button[type="submit"]', {
                visible: true,
            });
            await page.click('button[type="submit"]');
            const sms = await requestSMS(id);
            //const formattedCode = await requestSMS(id);
            //await page.type('#verification-code-field', formattedCode)
            return console.log(sms);

        } else if (cur_url.includes("https://login.yahoo.com/account/challenge/captcha-verify")) {
            const requestId = await initiateCaptchaRequest(c2apiKey);
            const response = await pollForRequestResults(c2apiKey, requestId);
            await page.evaluate("document.getElementById(\"recaptcha-iframe\").contentWindow.document.getElementById(\"g-recaptcha-response\").innerHTML=\'" + response + "\';");
            return console.log("Captcha Found");
        } else if (cur_url.includes("https://login.yahoo.com/account/challenge/fail")) {
            await startProcess();
            return console.log("Phone Blocked");
        }
    }

    await startProcess();

    //var message = "Success! Submitted the following information: \n\nName: " + firstname + " " + lastname + "\nEmail: " + email + "@yahoo.com \nPass: " + pass + "\n";
    //await console.log(message);
    // await browser.close();

})()

async function initiateCaptchaRequest(apiKey) {
    const formData = {
        method: 'userrecaptcha',
        googlekey: siteDetails.sitekey,
        key: apiKey,
        pageurl: siteDetails.pageurl,
        json: 1
    };
    const response = await request.post('http://2captcha.com/in.php', {
        form: formData
    });
    return JSON.parse(response).request;
}

async function pollForRequestResults(key, id, retries = 30, interval = 1500, delay = 15000) {
    await timeout(delay);
    return poll({
        taskFn: requestCaptchaResults(key, id),
        interval,
        retries
    });
}

function requestCaptchaResults(apiKey, requestId) {
    const url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
    return async function() {
        return new Promise(async function(resolve, reject) {
            const rawResponse = await request.get(url);
            const resp = JSON.parse(rawResponse);
            if (resp.status === 0) return reject(resp.request);
            resolve(resp.request);
        });
    }
}

const timeout = millis => new Promise(resolve => setTimeout(resolve, millis))

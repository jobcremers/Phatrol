// Status:
// * START REWRITING INITIAL VERSION (2d of November 2020)

/*
 ________  ___  ___  ________  _________  ________  ________  ___
|\   __  \|\  \|\  \|\   __  \|\___   ___\\   __  \|\   __  \|\  \
\ \  \|\  \ \  \\\  \ \  \|\  \|___ \  \_\ \  \|\  \ \  \|\  \ \  \
 \ \   ____\ \   __  \ \   __  \   \ \  \ \ \   _  _\ \  \\\  \ \  \
  \ \  \___|\ \  \ \  \ \  \ \  \   \ \  \ \ \  \\  \\ \  \\\  \ \  \____
   \ \__\    \ \__\ \__\ \__\ \__\   \ \__\ \ \__\\ _\\ \_______\ \_______\
    \|__|     \|__|\|__|\|__|\|__|    \|__|  \|__|\|__|\|_______|\|_______|

*/


// Initial Requires
const puppeteer = require('puppeteer');
const request = require('request-promise-native');
const poll = require('promise-poller').default;
const https = require('https');
const readline = require('readline');


// Initial Definitions
const timeout = millis => new Promise(resolve => setTimeout(resolve, millis))
const siteDetails = {
    sitekey: '6LdWXicTAAAAAKIdor4xQ_gzgD-LgDP3siz7cop6',
    pageurl: 'https://login.yahoo.com/account/challenge/recaptcha'
};

// Define Out-of-Async Functions
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

function requestSMS(id) {
    const getSMS = httpGet(`https://sms-activate.ru/stubs/handler_api.php?api_key=940054f3775c2e49f71fd64c4c3ef116&action=getFullSms&id=${id}`);
    if (getSMS === "STATUS_WAIT_CODE" || "STATUS_CANCEL") {
        return requestSMS(id);
    } else {
        //const data = getSMS.split(":");
        return getSMS;
    }
}

// Start Async
(async function main() {
    // ASCII art in Console
    await console.log(' ________  ___  ___  ________  _________  ________  ________  ___\n' +
        '|\\   __  \\|\\  \\|\\  \\|\\   __  \\|\\___   ___\\\\   __  \\|\\   __  \\|\\  \\\n' +
        '\\ \\  \\|\\  \\ \\  \\\\\\  \\ \\  \\|\\  \\|___ \\  \\_\\ \\  \\|\\  \\ \\  \\|\\  \\ \\  \\\n' +
        ' \\ \\   ____\\ \\   __  \\ \\   __  \\   \\ \\  \\ \\ \\   _  _\\ \\  \\\\\\  \\ \\  \\\n' +
        '  \\ \\  \\___|\\ \\  \\ \\  \\ \\  \\ \\  \\   \\ \\  \\ \\ \\  \\\\  \\\\ \\  \\\\\\  \\ \\  \\____\n' +
        '   \\ \\__\\    \\ \\__\\ \\__\\ \\__\\ \\__\\   \\ \\__\\ \\ \\__\\\\ _\\\\ \\_______\\ \\_______\\\n' +
        '    \\|__|     \\|__|\\|__|\\|__|\\|__|    \\|__|  \\|__|\\|__|\\|_______|\\|_______|\n');

    await console.log('________________________________________________________________________\n');
    await console.log('Waiting....');
    await console.log("\nStarting Systems...");

    // Configure Puppeteer for launch (add attributes)
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-web-security',
            '--user-data-dir=\\Phatrol'
        ],
    });

    // Request newPage (headless browser)
    const page = await browser.newPage();

    // Start httpGet in-value function
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

    // <--> START PERSONAL-DATA GENERATION <-->

    // Start request to namefake
    const body = await httpGet('https://api.namefake.com');

    // Parse response towards JSON object
    const jsonObject = JSON.parse(body);

    // Parse 'name' from jsonObject (first + last name)
    const names_combinded = jsonObject.name;

    // Parse 'birth_data' from jsonObject (birthday)
    const birthdate_combined = jsonObject.birth_data;

    // Split both variables for data-parsing
    const dates = birthdate_combined.split("-");
    const names = names_combinded.split(" ");

    // Parse data.
    const firstname = names[0];
    const lastname = names[1];
    let b_year = dates[0];
    const b_day = dates[2];

    // Check if user age is 18+, if not, change date.
    if (b_year >= "2002") {
        b_year = "1988";
    }

    // Format constant 'month' to single digit
    // (for example: March = 03. Multiply with 1 --> 03 * 1 = 3)
    const b_month_unformatted = dates[1];
    const b_month = (b_month_unformatted * 1).toString();

    // Parse random digit for adding to email.
    const randoms = random();


    // Start Async-Function for the process
    async function startProcess() {
        // Console.log(); for status-update
        await console.log("Starting startProcess() fromt the top!");

        // Request number from service-provider.
        const getNum = await httpGet('https://sms-activate.ru/stubs/handler_api.php?api_key=940054f3775c2e49f71fd64c4c3ef116&action=getNumber&service=mb&ref=839469&country=6');

        // If response = no_balance -> can not do anything = return process. If no_available -> wait some time = restart process.
        if (getNum === "NO_BALANCE") {
            await browser.close();
            return console.log("Error! CAN NOT activate SMS!");
        } else if (getNum === "NO_NUMBERS") {
            await console.log("Error! No numbers available -  am waiting 3 seconds to try again!");
            return setTimeout(function(){startProcess()}, 3500)
        }

        // Total Data splitted to multiple variables.
        const data = getNum.split(":");

        // Phone # ID
        const id = data[1];

        // Phone # minus countrycode.
        const num = data[2].substr(2);

    }
})()

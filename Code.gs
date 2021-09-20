/**
 * This function retrieves all payments from the payment spreadsheet and returns them as an array of the rows.
 * @returns: payment data from the payments spreadsheet as a list of rows
 */
function getPaymentData() {

    var LOGGING_PREFIX = '[getPaymentData] ';

    Logger.log(LOGGING_PREFIX + 'started');

    /*
    get all payments from the spreadsheet app
    Source: https://developers.google.com/sheets/api/quickstart/apps-script
    */
    // var paymentSpreadSheetId = '1ZwZXK1KcAVIeOh-FgFZKPEOEFwUTaJzDExaWD1ZIQmc'; // new spreadsheet with payments
    var paymentSpreadSheetId = '13YSSxKWzS8khlm_oMfDNcDCsW6SgVtjNJlA1q8zpoTI'; // original membership spreadsheet
    var dataRange = 'List of members!A2:W'; // <SHEET_NAME>!<RANGE_START>:<RANGE_END>
    var payments = Sheets.Spreadsheets.Values.get(paymentSpreadSheetId, dataRange).values;

    if (!payments) {
        Logger.log(LOGGING_PREFIX + 'no payment data found in spreadsheet.') // TODO: error
    }

    Logger.log(LOGGING_PREFIX + 'payment data retrieved from spreadsheet.');

    return payments;
}

/**
 * This method returns the last validity date (column N) from the payments spreadsheet for a given user.
 * @param user: user object from the google admin directory
 * @param payments: payment data from the payments spreadsheet as a list of rows
 * @returns: date up to which the account is valid
 */
function getAccountValidityEndDate(user, payments) {

    var LOGGING_PREFIX = '[getAccountValidityEndDate] ';

    // Logger.log(LOGGING_PREFIX + 'started');

    var validityEndDate = null;

    try {
        var userId = user.externalIds[0].value; // User ID used to identify the payments associated to this user
    } catch (error) {
        Logger.log(LOGGING_PREFIX + 'Cannot get ID from user: ' + JSON.stringify(user));
        return;
    }

    if (!payments) {
        Logger.log(LOGGING_PREFIX + 'No payment data given!');
    } else {

        for (var row = 0; row < payments.length; row++) {
            if (payments[row][0] == userId) {
                if (validityEndDate === null || validityEndDate < payments[row][13]) { // 'N' i.e. 'End of Membership' is column 13
                    validityEndDate = payments[row][13];
                    // Logger.log(LOGGING_PREFIX + 'Updated validity end date for user ' + user.name.fullName + ' [' + userId + '] to ' + payments[row][12]); // todo: remove after tesing
                }
            }
        }
    }

    if (validityEndDate === null) {
        Logger.log(LOGGING_PREFIX + 'No validity end date found for user ' + user.name.fullName + ' [' + userId + '].');
    }

    return validityEndDate;

}

/** 
 * This functions changes the format of a date string from 18.09.2013 to 2013-09-18
 */
function reformatDateString(dateStr) {

    var LOGGING_PREFIX = 'reformatDateString';

    var elements = dateStr.split('.');
    if (elements.length !== 3) {
        Logger.log(LOGGING_PREFIX + 'Invalid date ' + String(dateStr) + '.');
        return;
    }

    elements = elements.reverse();

    return elements.join('-');
}

/**
 * If the number of e-mails that can be send by the script drops below 20 (there is a maximum email quota set by google script), the admins will be informed.
 */
function checkDailyEMailQuota() {

    var LOGGING_PREFIX = 'checkDailyEMailQuota';

    var emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log(LOGGING_PREFIX + 'Remaining email quota: ' + emailQuotaRemaining); // todo: remove after testing

    if (emailQuotaRemaining < 21) {
        MailApp.sendEmail('admin@bestalumni.net', 'Warning E-Mail Quota Limit', 'The google app script "check for upcoming renewal" will soon reach its E-Mail quota limit!');
        // Todo: refactor this, so that the email addresses of membres that could not have an email send to will be logged and included in the message.
    }

}

/**
 * This function sends out an e-mail if a users account is about to expire.
 * @param user: user object from the google admin directory
 * @param validityEndDate: Date Object
 */
function sendMembershipRenewalEMail(user, validityEndDate) {

    var LOGGING_PREFIX = 'sendMembershipRenewalEMail';

    checkDailyEMailQuota();

    var validityEndString = Utilities.formatDate(validityEndDate, 'CET', 'dd/MM/yyyy');

    // checking the users secondary e-mail address
    var secondaryEmailAddress = user.recoveryEmail;
    if (secondaryEmailAddress == '') {
        for (var i = 0; i < user.emails.length; i++) {
            if ((user.emails[i].address != user.primaryEmail) && !user.emails[i].address.includes('@bestalumni.net')){
                secondaryEmailAddress = user.emails[i].address; 
            }
        }
    }

    var recipient = user.primaryEmail;
    var subject = 'BEST Alumni Network - Renew your membership !';
    var content = makeRenewalEMailContent(user.name.fullName, validityEndString);
    var options = {
        'cc': secondaryEmailAddress,
        'bcc': 'admin@bestalumni.net',
        'replyTo': 'membership@bestalumni.net'
    };

    MailApp.sendEmail(recipient, subject, content, options);

}

/**
 * This functions sends a summary to admin@bestalumni.net at the end of this scripts execution
 * @param error_accounts
 */
function sendSummaryEMail(error_accounts, expired_accounts, reminded_accounts) {

    var LOGGING_PREFIX = 'sendSummaryEMail';

    checkDailyEMailQuota();

    var recipient = 'admin@bestalumni.net,filip.schlembach@bestalumni.net';
    var subject = 'Membership renewal summary';
    var content = makeSummaryEMailContent(error_accounts, expired_accounts, reminded_accounts);

    MailApp.sendEmail(recipient, subject, content);

}

/**
 * This function checks which BAN member's accounts expire in one month
 * It is run periodically by a trigger.
 */
function main() {

    var LOGGING_PREFIX = '[main] ';

    Logger.log(LOGGING_PREFIX + 'started');

    /*
    Running a Google App Script periodically:
    Edit -> Current projects triggers
    */

    // Getting all payments from the google spreadsheet
    var payments = getPaymentData();

    /*
    Go through all users of the G Suite Directory
    Documentation on Admin Directory
    - quick start guide: https://developers.google.com/admin-sdk/directory/v1/quickstart/apps-script
    - developers guide:  https://developers.google.com/admin-sdk/directory/v1/guides/guides
    - api reference:     https://developers.google.com/admin-sdk/directory/v1/reference
    - code snippet:      https://developers.google.com/apps-script/advanced/admin-sdk-directory#list_all_users
    */
    var optionalArgs = {
        customer: 'my_customer',
        maxResults: 500, // TODO: this could cause a problem in the future, when BAN gets more than 500 members. How to handle that?
        orderBy: 'email'
    };


    var response = AdminDirectory.Users.list(optionalArgs);
    var users = response.users;

    // check for every user if his account expires in the next month.
    var today = new Date();
    var oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    var error_accounts = []; // List of accounts that can not be evaluated by the script for one reason or another
    var expired_accounts = []; // List of Users who's accounts have expired
    var reminded_accounts = []; // List of Users that have been reminded of their upcoming membership renewal

    // Logger.log(LOGGING_PREFIX + 'today = ' + Utilities.formatDate(today, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.
    // Logger.log(LOGGING_PREFIX + 'oneMonthFromNow = ' + Utilities.formatDate(oneMonthFromNow, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.

    if (users && users.length > 0) {
        Logger.log(LOGGING_PREFIX + users.length + ' users found.');
        for (i = 0; i < users.length; i++) {
            var user = users[i];

            // Get the date until when the account is valid accourding to the payment spreadsheet.
            var validityEndDateStr = getAccountValidityEndDate(user, payments);
            if (!validityEndDateStr) {
                Logger.log(LOGGING_PREFIX + 'Could not detemine date of validity for ' + user.primaryEmail + '.');
                error_accounts.push(user.primaryEmail.toString());
                continue;
            }
            var validityEndDate = new Date(reformatDateString(validityEndDateStr));

            // Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account expiration date: ' + Utilities.formatDate(validityEndDate, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.

            // deactivate the account if the validity end date is in the past
            if (validityEndDate.getTime() < today.getTime()) {
                Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account is already expired: ' + Utilities.formatDate(validityEndDate, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.
                expired_accounts.push(user.primaryEmail.toString() + ' ' + Utilities.formatDate(validityEndDate, 'CET', 'dd.MM.yyyy'));
                // TODO: deactivate account if that has not already happened?
                // TODO: add one week of buffer to process payments,...

                // send a reminder E-Mail if the account expires today in one month.
            } else if (Utilities.formatDate(validityEndDate, 'CET', 'yyyy-MM-dd') == Utilities.formatDate(oneMonthFromNow, 'CET', 'yyyy-MM-dd')) {
                Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will expire today in one month: ' + Utilities.formatDate(validityEndDate, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.

                // send an e-mail to the user if his / her account will expire in one month
                sendMembershipRenewalEMail(user, validityEndDate);
                reminded_accounts.push(user.primaryEmail.toString() + ' ' + Utilities.formatDate(validityEndDate, 'CET', 'dd.MM.yyyy'));

            }

        }
    } else {
        // logToSlack('No users found.', LOGGING_SOURCE_NAME);
    }

    sendSummaryEMail(error_accounts, expired_accounts, reminded_accounts);

}

function makeRenewalEMailContent(memberName, validityEndString) {

  var content = 'Dear ' + memberName + ',\n\n';
  content += 'Your year of BAN membership will reach its end on ' + validityEndString + '. ';
  content += 'Thanks to you, we built the foundations of BEST Alumni Network, set up an IT structure, gather 150 alumni, and organize the first events and projects.\n\n';
  content += 'We need you to keep your involvement up so that BAN keeps growing and developing more projects, more ways to help alumni connect and learn from each other.\n\n';
  content += 'To renew your membership for one year, please proceed to the payment of 10 euros, by bank transfer (same as last year). Don\'t forget to state your name :)\n\n';
  content += 'Account owner: BEST ALUMNI NETWORK AISBL\n';
  content += 'IBAN: BE08363181232113\n';
  content += 'BIC: BBRUBEBB\n';
  content += 'Bank: ING België/ING Belgique/ING Belgium. Avenue Marnix 24, 1000 Brussels\n\n';
  content += 'To pay by card / apple pay / google pay please follow this link: https://payments.bestalumni.net \n\n';
  content += 'Here is your chance to renew your membership. If you don’t, your account will be de-activated and you will be removed from the mailing lists.\n\n';
  content += 'Any question or suggestion is welcome. Just answer this email :)\n\n';
  content += 'Thank you very much and see you soon\n\n';
  content += 'The BAN Board and admin crew';

  return content;

}

function makeSummaryEMailContent(error_accounts, expired_accounts, reminded_accounts) {

    var content = 'Summary e-mail for the membership renewal script.\n\n';
    content += 'The following members have been reminded of their upcoming renewal:\n';
    if (reminded_accounts.length == 0) {
        content += '(none)';
    } else {
        content += reminded_accounts.join('\n');
    }

    content += '\n';
    content += '\n';

    content += 'The following accounts are expired:\n';
    if (expired_accounts.length == 0) {
        content += '(none)';
    } else {
        content += expired_accounts.join('\n');
    }
    content += '\n';
    content += '\n';

    content += 'The following accounts could not be evaluated properly:\n';
    if (error_accounts.length == 0) {
        content += '(none)';
    } else {
        content += error_accounts.join('\n');
    }
    content += '\n';
    content += '\n';

    content += 'https://script.google.com/a/bestalumni.net/d/1oRymdYNxTu_nKF6mptWGd93Tsygc9Ieb_Js91l2EV7d5MFlGZZ0nUaY6/edit?usp=drive_web';

    return content;

}

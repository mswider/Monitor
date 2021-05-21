const fetch = require('node-fetch');

if (process.argv[2]) {
  const orgId = process.argv[2];
  let urlencoded = new URLSearchParams();
  urlencoded.append('orgRands[]', orgId);
  const options = {
    method: 'POST',
    headers: {
      'Authorization': '',  //They require the "Authorization" header despite it having no compRand
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: urlencoded.toString()
  };
  (async () => {
    const request = await fetch('https://extapi.goguardian.com/api/v1/ext/register', options);
    if (await request.status == 200) {
      const response = await request.json();
      const orgName = new Buffer.from(response.orgName, 'base64').toString('ascii');
      console.log(`Your new account has successfully been created under the school "${orgName}"`);
      console.log('Below is your GoGuardian ID, or compRand:');
      console.log(response.compRandUuid + '\n');
      console.log('It important that you do not lose it, so saving it in a file is recommended');
      console.log('You can use this ID as a worker in Monitor since it isn\'t connected to anyone');
    } else {
      console.log('The school ID provided is invalid, so no account could be created');
    }
  })();
} else {
  console.log('A valid school ID is required to create a GoGuardian user account');
  console.log('You can find your school ID by looking at the extension ID of the "GoGuardian License" Chrome extension \n');
  console.log('Command usage example:');
  console.log('npm run createUser -- "asdfghjklqwertyuiopzxcvbnm"');
}
